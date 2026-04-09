import { motion } from 'framer-motion';
import { QrCode, Clock, RefreshCw, Users, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { QRCodeCanvas } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { useQRGenerator } from '@/SharedLogic/hooks/useQRGenerator';

interface QRGeneratorDisplayCardProps {
  qr: ReturnType<typeof useQRGenerator>;
}

export function QRGeneratorDisplayCard({ qr }: QRGeneratorDisplayCardProps) {
  const { activeSession, isExpired, timeLeft, scannedStudents, isLoading } = qr.state;
  const { handleRefreshQR, formatTime } = qr.actions;

  return (
    <Card className="overflow-hidden border-none shadow-2xl bg-card/50">
      <CardHeader className="bg-muted/30 border-b border-border/50">
        <CardTitle className="text-lg flex items-center gap-2 italic uppercase font-black tracking-tight">
          <QrCode className="w-5 h-5 text-primary" />
          QR Code & Real-time Scans
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activeSession ? (
          <div className="space-y-8">
            <div className="text-center space-y-4">
              {/* Session Info */}
              <div className="flex flex-wrap justify-center gap-2">
                <Badge variant="secondary" className="px-3 py-1 rounded-full font-bold uppercase">{activeSession.subject_name}</Badge>
                <Badge variant="outline" className="px-3 py-1 rounded-full border-primary/30 text-primary font-black uppercase">Pertemuan {activeSession.meeting_number}</Badge>
                <Badge className="px-3 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 border-none shadow-none font-black uppercase tracking-tighter italic">Kelas {activeSession.class_name}</Badge>
              </div>

              {isExpired ? (
                <div className="flex flex-col items-center justify-center p-8 bg-muted/20 rounded-2xl border-2 border-dashed border-muted-foreground/30">
                  <Clock className="w-12 h-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground font-medium mb-4 italic">Sesi Absensi Berakhir</p>
                  <Button onClick={handleRefreshQR} className="gap-2 rounded-xl bg-primary hover:bg-primary/90" disabled={isLoading}>
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                    Mulai Sesi Baru
                  </Button>
                </div>
              ) : (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-3xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative bg-white p-6 rounded-3xl inline-block shadow-inner border border-white/50">
                    <QRCodeCanvas
                      value={activeSession.qr_code}
                      size={220}
                      level={"H"}
                      includeMargin={false}
                      className="mx-auto"
                    />
                  </div>
                </div>
              )}

              {!isExpired && (
                <div className="space-y-4">
                  {/* Timer */}
                  <div className={cn(
                    "inline-flex items-center gap-2 px-4 py-2 rounded-full font-mono text-lg font-black shadow-sm transition-colors",
                    timeLeft < 10
                      ? 'bg-rose-500/10 text-rose-500 animate-pulse'
                      : 'bg-primary/5 text-primary'
                  )}>
                    <Clock className="w-5 h-5" />
                    <span>Token Reset: {formatTime(timeLeft)}s</span>
                  </div>

                  <div className="flex gap-3 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 rounded-full px-4 border-primary/20 hover:bg-primary/5 font-black uppercase tracking-tighter"
                      onClick={handleRefreshQR}
                      disabled={isLoading}
                    >
                      <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                      Refresh Token
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="gap-2 rounded-full px-4 font-black uppercase tracking-tighter shadow-sm"
                      onClick={() => qr.actions.refreshData()}
                      disabled={isLoading}
                    >
                      <Users className={cn("w-4 h-4", isLoading && "animate-spin")} />
                      Refresh List
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* REAL-TIME STUDENT LIST */}
            <div className="space-y-4 pt-4 border-t border-border/50">
              <div className="flex items-center justify-between">
                <h4 className="font-black text-sm uppercase tracking-widest flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Mahasiswa Terabsen ({scannedStudents.length} / {qr.state.totalClassStudents})
                </h4>
                {scannedStudents.length > 0 && (
                  <div className="bg-emerald-500/10 text-emerald-600 font-black px-2 py-0.5 rounded-full text-[10px] animate-pulse uppercase tracking-tighter">
                    Live Feedback
                  </div>
                )}
              </div>

              <div className="max-h-[250px] overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                {scannedStudents.length === 0 ? (
                  <div className="text-center py-8 bg-muted/30 rounded-2xl border-2 border-dashed border-border/50">
                    <div className="animate-bounce mb-2">
                      <Loader2 className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                    </div>
                    <p className="text-xs text-muted-foreground font-bold italic">Menunggu mahasiswa scanning...</p>
                  </div>
                ) : (
                  scannedStudents.map((item, idx) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-2xl bg-muted/30 border border-border/30 hover:bg-muted/50 transition-all border-l-4 border-l-emerald-500"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                          {item.avatar_url ? (
                            <img src={item.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-primary/50" />
                          )}
                        </div>
                        <div>
                          <p className="font-black text-sm text-foreground">{item.name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono font-bold tracking-tight">{item.nim}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="bg-emerald-500/10 text-emerald-700 font-black px-2 py-0.5 rounded-full text-[10px] inline-block uppercase tracking-tighter">Hadir</div>
                        <p className="text-[9px] text-muted-foreground mt-1 font-bold">
                          {new Date(item.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </p>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20 px-8">
            <div className="w-40 h-40 mx-auto mb-6 rounded-full bg-primary/5 flex items-center justify-center relative">
              <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-spin-slow"></div>
              <QrCode className="w-20 h-20 text-primary/20" />
            </div>
            <h4 className="text-xl font-black mb-2 uppercase tracking-tight italic">Siap untuk Sesi Baru?</h4>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto font-medium">
              Silakan pilih Semester, Mata Kuliah, Pertemuan, dan Kelas untuk memulai absensi.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
