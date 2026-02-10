import { useState, useEffect, useRef, useCallback } from 'react';
import {
  QrCode, Camera, CheckCircle2, XCircle,
  MapPin, Wifi, WifiOff, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { SwitchCamera, Zap, ZapOff } from 'lucide-react';

interface ScanResult {
  success: boolean;
  message: string;
  subject?: string;
  meeting?: number;
}

export default function ScanQR() {
  const { user, isMahasiswa, isAdminDev } = useAuth();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [isOnlineMode, setIsOnlineMode] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackCamera, setIsBackCamera] = useState(true); // Track camera facing: true = back, false = front
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const [showScannerUI, setShowScannerUI] = useState(false);

  // Campus location (example coordinates - UNJ)
  const CAMPUS_LAT = -6.1876;
  const CAMPUS_LNG = 106.8768;
  const MAX_DISTANCE = 150; // meters

  useEffect(() => {
    // Get user location for offline mode validation
    if (!isOnlineMode && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('Tidak dapat mengakses lokasi. Pastikan GPS aktif.');
        }
      );
    }
  }, [isOnlineMode]);

  useEffect(() => {
    // Warn if non-secure context
    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      toast.warning("Koneksi tidak aman (HTTP). Kamera mungkin diblokir browser.", { duration: 5000 });
    }

    return () => {
      // Cleanup
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {
          console.error("Cleanup error", e);
        }
      }
    };
  }, []);

  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const startScanner = async (useBackCamera: boolean = isBackCamera) => {
    // Security Check for Camera Access
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      toast.error("Kamera butuh koneksi HTTPS atau Localhost.", { duration: 5000 });
      return;
    }

    setIsScanning(true);
    setShowScannerUI(true);
    setScanResult(null);
    isProcessingRef.current = false;

    // Wait for UI to render div
    setTimeout(async () => {
      try {
        // Clean up existing if any (safety)
        if (scannerRef.current) {
          try { await scannerRef.current.stop(); } catch (e) { /* ignore */ }
          scannerRef.current.clear();
        }

        const html5QrCode = new Html5Qrcode("qr-reader");
        scannerRef.current = html5QrCode;

        // Use facingMode constraint for mobile reliability
        const facingMode = useBackCamera ? 'environment' : 'user';

        await html5QrCode.start(
          { facingMode: facingMode },
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            onScanSuccess(decodedText);
          },
          (errorMessage) => {
            // ignore frame errors
          }
        );
      } catch (err) {
        console.error("Error starting scanner", err);
        setIsScanning(false);
        setShowScannerUI(false);

        // Fallback error handling
        if (useBackCamera) {
          toast.error("Kamera belakang tidak tersedia. Coba kamera depan.");
          // Try front camera as fallback
          setIsBackCamera(false);
          setTimeout(() => startScanner(false), 500);
        } else {
          toast.error("Gagal memulai kamera. Pastikan izin diberikan.");
        }
      }
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch (e) { console.error("Stop error", e); }
    }
    setIsScanning(false);
    setShowScannerUI(false);
  };

  const switchCamera = async () => {
    if (!isScanning || !scannerRef.current) return;

    setIsProcessing(true); // Show loading during switch

    try {
      // Step 1: Stop current camera completely
      await scannerRef.current.stop();
      scannerRef.current.clear();

      // Step 2: Toggle camera state
      const newIsBackCamera = !isBackCamera;
      setIsBackCamera(newIsBackCamera);

      // Step 3: Wait for hardware to reset (critical for mobile)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 4: Start with new facing mode
      await startScanner(newIsBackCamera);

      toast.success(`Beralih ke kamera ${newIsBackCamera ? 'belakang' : 'depan'}`);
    } catch (e) {
      console.error("Error switching camera", e);
      toast.error("Gagal mengganti kamera");
    } finally {
      setIsProcessing(false);
    }
  };

  // Constants
  const UNJ_LAT = -6.1947;
  const UNJ_LNG = 106.8794;
  const MAX_DISTANCE_METERS = 150;

  // Validate Class: Check if student belongs to the class in the QR
  const validateClass = async (qrClassId: string) => {
    if (!user) return false;

    // Get user's profile to check class_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('class_id')
      .eq('user_id', user.id)
      .single();

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

    // Stop scanning immediately provided by Html5Qrcode logic is different (we might want to keep scanning frame but just ignore results, or stop. Let's Pause.)
    if (scannerRef.current) {
      scannerRef.current.pause(true);
    }

    // Haptic Feedback
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }

    isProcessingRef.current = true;
    setIsProcessing(true);
    setScanResult(null);

    try {
      // 1. Parse Payload
      let payload;
      try {
        payload = JSON.parse(decodedText);
        // Format: { s: sessionId, c: classId, t: token }
        if (!payload.s || !payload.c || !payload.t) throw new Error("Invalid Format");
      } catch (e) {
        throw new Error("QR Code tidak dikenali atau rusak.");
      }

      // 2. Validate GPS (If Toggle is Active)
      if (!isOnlineMode) {
        if (!location) throw new Error("Lokasi tidak ditemukan. Aktifkan GPS.");
        const dist = calculateDistance(location.lat, location.lng, UNJ_LAT, UNJ_LNG);

        if (dist > MAX_DISTANCE_METERS) {
          throw new Error(`Jarak kejauhan! Anda ${Math.round(dist)}m dari kampus. Maksimum yang diizinkan adalah ${MAX_DISTANCE_METERS}m.`);
        }
      }

      // 3. Validate Class Match
      const isClassValid = await validateClass(payload.c);
      if (!isClassValid) throw new Error("QR Code ini bukan untuk kelas Anda.");

      // 4. Validate Session & Token in DB
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`*, meetings(meeting_number, subjects(name))`)
        .eq('id', payload.s)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (sessionError || !session) throw new Error("Sesi absensi tidak ditemukan atau sudah berakhir.");

      // Verify Token (Anti-Cheat 1-2 Mins)
      const dbPayload = JSON.parse(session.qr_code);
      if (dbPayload.t !== payload.t) {
        throw new Error("QR Code sudah kadaluarsa (Token mismatch). Silakan scan ulang yang terbaru dari layar dosen.");
      }

      // 5. Check Duplicate Attendance
      const { data: existing } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', payload.s)
        .eq('student_id', user?.id)
        .maybeSingle();

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

      // 6. Insert Attendance
      const { error: insertError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: payload.s,
          student_id: user?.id,
          status: 'hadir',
          scanned_at: new Date().toISOString()
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
      console.error("Scan Error:", error);
      setScanResult({
        success: false,
        message: error.message || "Gagal memproses absensi."
      });
      toast.error(error.message);
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
      // Do NOT resume scanner automatically to show result
      // But we can stop the camera stream to save battery
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
      setIsScanning(false);
      setShowScannerUI(false);
    }
  }, [isOnlineMode, location, user]);

  // const onScanFailure... removed as inline lambda

  // If user is not logged in or doesn't have access
  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Login Diperlukan</h2>
          <p className="text-muted-foreground mt-2">
            Silakan login terlebih dahulu
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <QrCode className="w-7 h-7 text-primary" />
          Scan QR Absensi
        </h1>
        <p className="text-muted-foreground mt-1">
          Scan QR Code dari dosen untuk mencatat kehadiran
        </p>
      </div>

      {/* Mode Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isOnlineMode ? (
                <Wifi className="w-5 h-5 text-success" />
              ) : (
                <WifiOff className="w-5 h-5 text-warning" />
              )}
              <div>
                <p className="font-medium">
                  Mode {isOnlineMode ? 'Online' : 'Offline (Lokasi)'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isOnlineMode
                    ? 'Scan dari mana saja'
                    : `Harus dalam radius ${MAX_DISTANCE}m dari kampus`
                  }
                </p>
              </div>
            </div>
            <Switch
              checked={!isOnlineMode}
              onCheckedChange={(checked) => setIsOnlineMode(!checked)}
            />
          </div>

          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 p-2 rounded">
            {!window.isSecureContext && window.location.hostname !== 'localhost' && (
              <span className="text-destructive font-bold">
                PERINGATAN: Kamera mungkin tidak jalan di HTTP. Gunakan HTTPS atau Localhost.
              </span>
            )}
          </div>

          {!isOnlineMode && location && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>
                Lokasi: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scanner Area */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Camera className="w-5 h-5" />
            {isScanning ? 'Scanning...' : 'Scanner QR'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!showScannerUI && !scanResult && (
            <div className="text-center py-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <QrCode className="w-16 h-16 text-primary" />
              </div>
              <Button onClick={() => startScanner()} size="lg" className="gap-2">
                <Camera className="w-5 h-5" />
                Mulai Scan
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Arahkan kamera ke QR Code yang ditampilkan dosen
              </p>
            </div>
          )}

          {showScannerUI && (
            <div className="relative overflow-hidden rounded-2xl bg-black">
              {/* Camera View */}
              <div
                id="qr-reader"
                className="w-full aspect-square md:aspect-[4/3] object-cover"
              />

              {/* Overlay Controls */}
              <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
                {/* Camera Switcher - Always show */}
                <Button
                  variant="secondary"
                  size="icon"
                  className="rounded-full bg-white/20 backdrop-blur-md hover:bg-white/40 text-white border-none shadow-lg"
                  onClick={switchCamera}
                  disabled={isProcessing}
                  title={isBackCamera ? 'Ganti ke Kamera Depan' : 'Ganti ke Kamera Belakang'}
                >
                  <SwitchCamera className="w-6 h-6" />
                </Button>
              </div>

              {/* Guide Frame (Optional visual) */}
              <div className="absolute inset-0 border-2 border-white/30 pointer-events-none rounded-2xl">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-primary rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
              </div>

              {/* Cancel Button */}
              <div className="absolute bottom-6 left-0 right-0 flex justify-center z-20">
                <Button variant="destructive" onClick={stopScanner} className="rounded-full px-8 shadow-xl">
                  Batal Scan
                </Button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-8">
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Memproses absensi...</p>
            </div>
          )}

          {scanResult && (
            <div className={`text-center py-8 rounded-2xl ${scanResult.success ? 'bg-success/10' : 'bg-destructive/10'
              }`}>
              {scanResult.success ? (
                <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              )}

              <h3 className={`text-xl font-semibold ${scanResult.success ? 'text-success' : 'text-destructive'
                }`}>
                {scanResult.success ? 'Berhasil!' : 'Gagal'}
              </h3>

              <p className="text-muted-foreground mt-2">
                {scanResult.message}
              </p>

              {scanResult.success && scanResult.subject && (
                <div className="flex justify-center gap-2 mt-4 items-center">
                  <Badge variant="secondary" className="rounded-full px-3">{scanResult.subject}</Badge>
                  <Badge variant="outline" className="rounded-full px-3 border-primary/30 text-primary flex items-center gap-1">
                    <QrCode className="w-3 h-3" />
                    QR Hadir
                  </Badge>
                </div>
              )}

              <Button
                className="mt-6"
                onClick={() => {
                  setScanResult(null);
                  startScanner();
                }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Scan Lagi
              </Button>
            </div>
          )}

          {scanResult && scanResult.success && (
            <div className="mt-4 p-4 bg-muted rounded-lg text-center">
              <p className="text-sm">Silakan kembali ke tempat duduk.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Cara Absensi</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                1
              </span>
              <span className="text-muted-foreground">
                Pastikan dosen sudah menampilkan QR Code absensi
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                2
              </span>
              <span className="text-muted-foreground">
                Klik "Mulai Scan" dan arahkan kamera ke QR Code
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                3
              </span>
              <span className="text-muted-foreground">
                Tunggu hingga QR Code terbaca dan absensi tercatat
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-sm flex items-center justify-center flex-shrink-0">
                4
              </span>
              <span className="text-muted-foreground">
                QR Code berubah setiap 5 menit, pastikan scan tepat waktu
              </span>
            </li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
