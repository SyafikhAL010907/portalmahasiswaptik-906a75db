import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Html5Qrcode } from 'html5-qrcode';
import { webauthnService } from '../services/webauthnService';

const MAX_DISTANCE = 15; // Jarak maksimum absensi (100 Meter)

interface ScanResult {
  success: boolean;
  message: string;
  subject?: string;
  meeting?: number;
}

export function useScanQR() {
  const { user, isMahasiswa, isAdminDev } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackCamera, setIsBackCamera] = useState(true);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const [showScannerUI, setShowScannerUI] = useState(false);
  const [isVerifyingBiometric, setIsVerifyingBiometric] = useState(false);
  const [pendingPayload, setPendingPayload] = useState<{
    payload: any;
    session: any;
    location: { lat: number, lng: number } | null;
    distance: number;
    isMisslock: boolean;
  } | null>(null);

  useEffect(() => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      toast.warning("Koneksi tidak aman (HTTP). Kamera mungkin diblokir browser.", { duration: 5000 });
    }
    return () => {
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) scannerRef.current.stop();
          scannerRef.current.clear();
        } catch (e) { console.error("Cleanup error", e); }
      }
    };
  }, []);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const startScanner = async (useBackCamera: boolean = isBackCamera) => {
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      toast.error("Kamera butuh koneksi HTTPS atau Localhost.", { duration: 5000 });
      return;
    }
    setIsScanning(true);
    setShowScannerUI(true);
    setScanResult(null);
    isProcessingRef.current = false;
    setTimeout(async () => {
      try {
        if (scannerRef.current) {
          try { await scannerRef.current.stop(); } catch (e) { }
          scannerRef.current.clear();
        }
        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;
        const facingMode = useBackCamera ? 'environment' : 'user';
        await html5QrCode.start(
          { facingMode: facingMode },
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 }, 
            aspectRatio: 1.0,
            videoConstraints: {
              width: { min: 640, ideal: 1280, max: 1920 },
              height: { min: 480, ideal: 720, max: 1080 }
            }
          },
          (decodedText) => onScanSuccess(decodedText),
          (errorMessage) => { }
        );
      } catch (err) {
        setIsScanning(false);
        setShowScannerUI(false);
        toast.error("Gagal memulai kamera. Pastikan izin diberikan.");
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) { }
    }
    setIsScanning(false);
    setShowScannerUI(false);
  };

  const switchCamera = async () => {
    if (!isScanning || !scannerRef.current) return;
    setIsProcessing(true);
    try {
      await scannerRef.current.stop();
      scannerRef.current.clear();
      const newIsBackCamera = !isBackCamera;
      setIsBackCamera(newIsBackCamera);
      await new Promise(resolve => setTimeout(resolve, 500));
      await startScanner(newIsBackCamera);
    } catch (e) { toast.error("Gagal mengganti kamera"); }
    finally { setIsProcessing(false); }
  };

  const validateClass = async (qrClassId: string) => {
    if (!user) return false;
    const { data: profile } = await supabase.from('profiles').select('class_id').eq('user_id', user.id).single();
    if (!profile || !profile.class_id) {
      toast.error("Profil anda tidak memiliki data kelas!");
      return false;
    }
    if (profile.class_id !== qrClassId) {
      toast.error("QR Code ini bukan untuk kelas Anda!");
      return false;
    }
    return true;
  };

  const onScanSuccess = useCallback(async (decodedText: string) => {
    if (isProcessingRef.current) return;
    if (scannerRef.current) scannerRef.current.pause(true);
    if (navigator.vibrate) navigator.vibrate(200);
    isProcessingRef.current = true;
    setIsProcessing(true);
    setScanResult(null);

    try {
      // 1. Parse Payload
      let payload;
      try {
        payload = JSON.parse(decodedText);
      } catch (e) { throw new Error("QR Code tidak dikenali atau rusak."); }

      // 2. Fetch Session
      const { data: session, error: sessionError } = await (supabase.from('attendance_sessions') as any)
        .select(`*, meetings(meeting_number, subjects(name))`)
        .eq('id', payload.s)
        .eq('is_active', true)
        .single();
      if (sessionError || !session) throw new Error("Sesi absensi tidak ditemukan atau sudah berakhir.");

      // 3. fresh GPS check (anti fake gps/drift)
      const freshLocation = await new Promise<{ lat: number, lng: number } | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { timeout: 8000, enableHighAccuracy: true }
        );
      });

      let studentDistance = 0;
      let isMisslock = false;
      if (freshLocation) {
        setLocation(freshLocation);
        const lLat = payload.lat || (session as any).latitude;
        const lLng = payload.lng || (session as any).longitude;
        if (lLat && lLng) {
          studentDistance = calculateDistance(freshLocation.lat, freshLocation.lng, lLat, lLng);
          
          // --- 🛠️ LOGIKA DISKON JARAK (KALIBRASI) ---
          if (payload.df) {
            studentDistance = Math.max(0, studentDistance - payload.df);
            console.log(`📏 Jarak awal dikurangi diskon ${payload.df}m. Jarak final: ${studentDistance}m`);
          }

          isMisslock = studentDistance > MAX_DISTANCE;
        }
      }

      // 4. Class Match
      const isClassValid = await validateClass(payload.c);
      if (!isClassValid) throw new Error("QR Code ini bukan untuk kelas Anda.");

      // 5. BIOMETRIC VALIDATION PAUSE
      // Kita tahan dulu prosesnya dan minta UI tampilkan LockScreen (Satpam)
      const isBiometricSupported = await webauthnService.isSupported();
      if (isBiometricSupported) {
        setPendingPayload({
          payload,
          session,
          location: freshLocation,
          distance: studentDistance,
          isMisslock
        });
        setIsVerifyingBiometric(true);
        setIsProcessing(false); // Set false agar loading spinner di scanner ilang pas LockScreen muncul
        return; // BERHENTI DISINI, SATPAM LOCKSCREEN AMBIL ALIH
      }

      // If biometrics not supported, skip directly to finalization (fallback)
      await finalizeAttendance(payload, session, freshLocation, studentDistance, isMisslock);

    } catch (error: any) {
      console.error("Scan Error:", error);
      setScanResult({ success: false, message: error.message || "Gagal memproses QR Code." });
      toast.error(error.message);
    } finally {
      // Small delay to ensure state updates don't conflict with scanner pause
      setTimeout(() => {
        setIsProcessing(false);
        isProcessingRef.current = false;
      }, 500);
    }
  }, [location, user]);

  const finalizeAttendance = async (
    payload: any = pendingPayload?.payload,
    session: any = pendingPayload?.session,
    freshLocation: any = pendingPayload?.location,
    studentDistance: number = pendingPayload?.distance || 0,
    isMisslock: boolean = pendingPayload?.isMisslock || false
  ) => {
    setIsProcessing(true);
    setIsVerifyingBiometric(false);

    try {
      if (!payload || !session) throw new Error("Data absensi hilang bro!");

      // 6. Duplicate Check
      const { data: existing } = await supabase.from('attendance_records').select('id').eq('session_id', payload.s).eq('student_id', user?.id).maybeSingle();
      if (existing) {
        setScanResult({
          success: true,
          message: "Anda sudah melakukan absen untuk sesi ini.",
          subject: (session.meetings as any)?.subjects?.name,
          meeting: (session.meetings as any)?.meeting_number
        });
        toast.info("Sudah absen!");
        return;
      }

      // 7. Insert Record
      const { error: insertError } = await supabase.from('attendance_records').insert({
        session_id: payload.s,
        student_id: user?.id,
        status: 'present',
        scanned_at: new Date().toISOString(),
        latitude: freshLocation?.lat,
        longitude: freshLocation?.lng,
        distance_meters: studentDistance,
        is_misslock: isMisslock,
        method: 'qr'
      });
      if (insertError) throw insertError;

      setScanResult({
        success: true,
        message: "Mantap! Kehadiran kamu berhasil dicatat.",
        subject: (session.meetings as any)?.subjects?.name,
        meeting: (session.meetings as any)?.meeting_number
      });
      toast.success("Absensi Berhasil!");

    } catch (error: any) {
      console.error("Finalize Error:", error);
      setScanResult({ success: false, message: error.message || "Gagal mencatat absensi." });
      toast.error(error.message);
    } finally {
      setIsProcessing(false);
      setIsVerifyingBiometric(false); // DISMISS THE SATPAM
      setPendingPayload(null);
      isProcessingRef.current = false;
      if (scannerRef.current && scannerRef.current.isScanning) scannerRef.current.stop().catch(() => { });
      setIsScanning(false);
      setShowScannerUI(false);
    }
  };

  const cancelVerification = () => {
    setIsVerifyingBiometric(false);
    setPendingPayload(null);
    setIsProcessing(false);
    isProcessingRef.current = false;
    if (scannerRef.current && scannerRef.current.isScanning) scannerRef.current.stop().catch(() => { });
    setIsScanning(false);
    setShowScannerUI(false);
    toast.info("Validasi dibatalkan.");
  };

  return {
    state: {
      isScanning,
      scanResult,
      location,
      isProcessing,
      isBackCamera,
      MAX_DISTANCE_METERS: MAX_DISTANCE,
      user,
      isMahasiswa,
      isAdminDev,
      showScannerUI,
      isVerifyingBiometric
    },
    actions: { startScanner, stopScanner, switchCamera, setScanResult, finalizeAttendance, cancelVerification }
  };
}
