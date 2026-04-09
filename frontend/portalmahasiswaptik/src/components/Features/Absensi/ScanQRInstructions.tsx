import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function ScanQRInstructions() {
  return (
    <Card className="bg-card/50 border-none shadow-xl">
      <CardHeader>
        <CardTitle className="text-lg italic uppercase font-black tracking-tight">Cara Absensi</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          <li className="flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-black flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-inner">
              1
            </span>
            <span className="text-muted-foreground font-bold italic text-sm">
              Pastikan dosen sudah menampilkan QR Code absensi di layar depan
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-black flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-inner">
              2
            </span>
            <span className="text-muted-foreground font-bold italic text-sm">
              Klik tombol <strong className="text-foreground uppercase tracking-tight">"Mulai Scan"</strong> dan arahkan kamera ke arah QR Code
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-black flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-inner">
              3
            </span>
            <span className="text-muted-foreground font-bold italic text-sm">
              Tunggu hingga QR Code terbaca dan muncul pesan <strong className="text-emerald-600 uppercase tracking-tight">"Berhasil Absen"</strong>
            </span>
          </li>
          <li className="flex items-start gap-4">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-black flex items-center justify-center flex-shrink-0 border border-primary/20 shadow-inner">
              4
            </span>
            <span className="text-muted-foreground font-bold italic text-sm">
              QR Code berubah setiap 60 detik, pastikan token tetap hijau saat scan
            </span>
          </li>
        </ol>
      </CardContent>
    </Card>
  );
}
