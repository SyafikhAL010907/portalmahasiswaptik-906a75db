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
import { Html5QrcodeScanner, Html5QrcodeScanType } from 'html5-qrcode';

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
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const isProcessingRef = useRef(false);

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
    return () => {
      // Cleanup scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
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

  const startScanner = () => {
    setIsScanning(true);
    setScanResult(null);
    isProcessingRef.current = false;

    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "qr-reader",
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
        },
        false
      );

      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }, 100);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      await scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const onScanSuccess = useCallback(async (decodedText: string) => {
    // Prevent multiple scans
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setIsProcessing(true);

    try {
      // Validate location for offline mode
      if (!isOnlineMode) {
        if (!location) {
          setScanResult({
            success: false,
            message: 'Lokasi tidak tersedia. Aktifkan GPS.',
          });
          setIsProcessing(false);
          isProcessingRef.current = false;
          return;
        }

        const distance = calculateDistance(
          location.lat,
          location.lng,
          CAMPUS_LAT,
          CAMPUS_LNG
        );

        if (distance > MAX_DISTANCE) {
          setScanResult({
            success: false,
            message: `Anda terlalu jauh dari kampus (${Math.round(distance)}m). Maksimal ${MAX_DISTANCE}m.`,
          });
          await stopScanner();
          setIsProcessing(false);
          isProcessingRef.current = false;
          return;
        }
      }

      // Find the attendance session
      const { data: session, error: sessionError } = await supabase
        .from('attendance_sessions')
        .select(`
          *,
          meetings(meeting_number, subjects(name))
        `)
        .eq('qr_code', decodedText)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (sessionError || !session) {
        setScanResult({
          success: false,
          message: 'QR Code tidak valid atau sudah kadaluarsa.',
        });
        await stopScanner();
        setIsProcessing(false);
        isProcessingRef.current = false;
        return;
      }

      // Check if already attended
      const { data: existingRecord } = await supabase
        .from('attendance_records')
        .select('id')
        .eq('session_id', session.id)
        .eq('student_id', user?.id)
        .maybeSingle();

      if (existingRecord) {
        setScanResult({
          success: false,
          message: 'Anda sudah tercatat hadir di sesi ini.',
        });
        await stopScanner();
        setIsProcessing(false);
        isProcessingRef.current = false;
        return;
      }

      // Record attendance
      const { error: recordError } = await supabase
        .from('attendance_records')
        .insert({
          session_id: session.id,
          student_id: user?.id,
          status: 'present',
        });

      if (recordError) throw recordError;

      setScanResult({
        success: true,
        message: 'Absensi berhasil dicatat!',
        subject: (session.meetings as any)?.subjects?.name,
        meeting: (session.meetings as any)?.meeting_number,
      });

      toast.success('Absensi berhasil!');
      await stopScanner();
    } catch (error) {
      console.error('Error processing scan:', error);
      setScanResult({
        success: false,
        message: 'Terjadi kesalahan saat memproses absensi.',
      });
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [isOnlineMode, location, user?.id]);

  const onScanFailure = (error: string) => {
    // Ignore scan failures (no QR code detected)
    console.debug('Scan error:', error);
  };

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
          {!isScanning && !scanResult && (
            <div className="text-center py-8">
              <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                <QrCode className="w-16 h-16 text-primary" />
              </div>
              <Button onClick={startScanner} size="lg" className="gap-2">
                <Camera className="w-5 h-5" />
                Mulai Scan
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                Arahkan kamera ke QR Code yang ditampilkan dosen
              </p>
            </div>
          )}

          {isScanning && !isProcessing && (
            <div className="space-y-4">
              <div 
                id="qr-reader" 
                className="w-full max-w-md mx-auto overflow-hidden rounded-xl"
              />
              <div className="text-center">
                <Button variant="outline" onClick={stopScanner}>
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
            <div className={`text-center py-8 rounded-2xl ${
              scanResult.success ? 'bg-success/10' : 'bg-destructive/10'
            }`}>
              {scanResult.success ? (
                <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />
              ) : (
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
              )}
              
              <h3 className={`text-xl font-semibold ${
                scanResult.success ? 'text-success' : 'text-destructive'
              }`}>
                {scanResult.success ? 'Berhasil!' : 'Gagal'}
              </h3>
              
              <p className="text-muted-foreground mt-2">
                {scanResult.message}
              </p>

              {scanResult.success && scanResult.subject && (
                <div className="flex justify-center gap-2 mt-4">
                  <Badge variant="secondary">{scanResult.subject}</Badge>
                  <Badge variant="outline">Pertemuan {scanResult.meeting}</Badge>
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
