import { motion } from 'framer-motion';
import { Camera, QrCode, SwitchCamera, Loader2, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useScanQR } from '@/SharedLogic/hooks/useScanQR';

interface ScanQRScannerProps {
  scan: ReturnType<typeof useScanQR>;
}

export function ScanQRScanner({ scan }: ScanQRScannerProps) {
  const { isScanning, scanResult, isProcessing, isBackCamera, showScannerUI } = scan.state;
  const { startScanner, stopScanner, switchCamera, setScanResult } = scan.actions;

  return (
    <Card className="bg-card/50 border-none shadow-2xl">
      <CardHeader className="bg-muted/30 border-b border-border/50">
        <CardTitle className="text-lg flex items-center gap-2 italic uppercase font-black tracking-tight">
          <Camera className="w-5 h-5 text-primary" />
          {isScanning ? 'Scanning...' : 'Scanner QR Absensi'}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {!showScannerUI && !scanResult && (
          <div className="text-center py-8">
            <div className="w-32 h-32 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary/20 animate-spin-slow"></div>
              <QrCode className="w-16 h-16 text-primary" />
            </div>
            <Button 
              onClick={() => startScanner()} 
              size="lg" 
              className="gap-2 h-14 px-8 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-lg transition-all hover:scale-[1.05] active:scale-95"
            >
              <Camera className="w-6 h-6" />
              MULAI SCAN
            </Button>
            <p className="text-sm text-muted-foreground mt-6 font-bold italic">
              Arahkan kamera ke QR Code yang ditampilkan dosen
            </p>
          </div>
        )}

        {showScannerUI && (
          <div className="relative overflow-hidden rounded-3xl bg-black aspect-square md:aspect-[4/3] shadow-inner shadow-black/50 border border-white/10">
            {/* Camera View */}
            <div
              id="qr-reader"
              className="w-full h-full object-cover"
            />

            {/* Overlay Controls */}
            <div className="absolute top-4 right-4 flex flex-col gap-2 z-20">
              <Button
                variant="secondary"
                size="icon"
                className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-xl hover:bg-white/30 text-white border border-white/20 shadow-xl transition-all active:scale-90"
                onClick={switchCamera}
                disabled={isProcessing}
                title={isBackCamera ? 'Ganti ke Kamera Depan' : 'Ganti ke Kamera Belakang'}
              >
                <SwitchCamera className="w-6 h-6" />
              </Button>
            </div>

            {/* Guide Frame */}
            <div className="absolute inset-0 border-[40px] border-black/60 pointer-events-none flex items-center justify-center">
               <div className="w-64 h-64 border-2 border-primary rounded-3xl relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-xl -translate-x-1 -translate-y-1"></div>
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-xl translate-x-1 -translate-y-1"></div>
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-xl -translate-x-1 translate-y-1"></div>
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-xl translate-x-1 translate-y-1"></div>
                  
                  {/* Scanning Animation Line */}
                  <motion.div 
                    initial={{ top: "0%" }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_15px_rgba(var(--primary),0.8)]"
                  />
               </div>
            </div>

            {/* Cancel Button */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
              <Button 
                variant="destructive" 
                onClick={stopScanner} 
                className="rounded-full px-10 h-12 font-black uppercase tracking-widest shadow-2xl shadow-black/50 border-none transition-all active:scale-90"
              >
                BATAL SCAN
              </Button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="text-center py-12 bg-muted/20 rounded-3xl border border-dashed border-primary/20">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-6" />
            <h4 className="text-lg font-black uppercase tracking-widest italic">Memproses absensi...</h4>
            <p className="text-sm text-muted-foreground font-bold italic">Sedang memverifikasi data kamu di sistem</p>
          </div>
        )}

        {scanResult && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`text-center py-12 rounded-3xl shadow-2xl ${scanResult.success ? 'bg-emerald-500/10 border-2 border-emerald-500/20 shadow-emerald-500/10' : 'bg-rose-500/10 border-2 border-rose-500/20 shadow-rose-500/10'
            }`}
          >
            <div className="mb-6 relative inline-block">
               <motion.div 
                 initial={{ scale: 0 }} 
                 animate={{ scale: 1 }} 
                 transition={{ type: "spring", damping: 10, stiffness: 100 }}
               >
                 {scanResult.success ? (
                   <CheckCircle2 className="w-24 h-24 text-emerald-500" />
                 ) : (
                   <XCircle className="w-24 h-24 text-rose-500" />
                 )}
               </motion.div>
            </div>

            <h3 className={`text-3xl font-black uppercase tracking-tighter italic ${scanResult.success ? 'text-emerald-600' : 'text-rose-600'
              }`}>
              {scanResult.success ? 'BERHASIL ABSEN!' : 'Gagal Absen'}
            </h3>

            <p className="text-lg text-muted-foreground mt-3 font-bold italic max-w-sm mx-auto">
              {scanResult.message}
            </p>

            {scanResult.success && scanResult.subject && (
              <div className="flex flex-col gap-3 mt-8 items-center">
                <Badge variant="secondary" className="rounded-full px-6 py-2 text-lg font-black uppercase tracking-tighter bg-emerald-500/20 text-emerald-700 border-none">{scanResult.subject}</Badge>
                <Badge variant="outline" className="rounded-full px-4 py-1 border-primary/30 text-primary font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                  <QrCode className="w-3 h-3" />
                  Pertemuan {scanResult.meeting}
                </Badge>
              </div>
            )}

            <Button
              className="mt-10 h-14 px-10 rounded-2xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-xl transition-all active:scale-90"
              onClick={() => {
                setScanResult(null);
                startScanner();
              }}
            >
              <RefreshCw className="w-5 h-5 mr-3" />
              SCAN LAGI
            </Button>
          </motion.div>
        )}

        {scanResult && scanResult.success && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-emerald-500/5 rounded-2xl text-center border border-emerald-500/10 shadow-inner"
          >
            <p className="text-sm font-black uppercase tracking-widest text-emerald-600 italic">Silakan kembali ke tempat duduk bro!</p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
