import { useState } from 'react';
import { Search, Wallet, CreditCard, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BillDetail {
  week: number;
  status: string;
}

export default function Payment() {
  const [nim, setNim] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [unpaidWeeks, setUnpaidWeeks] = useState<BillDetail[]>([]);
  const [totalBill, setTotalBill] = useState(0);
  const [showQRIS, setShowQRIS] = useState(false);

  const handleCheckBill = async () => {
    if (!nim) {
      toast.error("Masukkan NIM dulu bro!");
      return;
    }

    setIsLoading(true);
    setStudentData(null);
    setUnpaidWeeks([]);
    setTotalBill(0);
    setShowQRIS(false);

    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim')
        .eq('nim', nim)
        .single();

      if (profileError || !profile) {
        toast.error("NIM tidak ditemukan!");
        setIsLoading(false);
        return;
      }

      setStudentData(profile);

      const { data: duesData, error: duesError } = await supabase
        .from('weekly_dues')
        .select('week_number, status')
        .eq('student_id', profile.user_id);

      if (duesError) throw duesError;

      const allWeeks = [1, 2, 3, 4];
      
      const bills: BillDetail[] = allWeeks
        .filter(w => {
          const record = duesData?.find(d => d.week_number === w);
          return !record || record.status === 'unpaid' || record.status === 'pending';
        })
        .map(w => {
          const record = duesData?.find(d => d.week_number === w);
          return { 
            week: w, 
            status: record?.status === 'pending' ? 'Pending' : 'Belum Bayar' 
          };
        });

      setUnpaidWeeks(bills);
      setTotalBill(bills.length * 5000);
      
      if (bills.length === 0) {
        toast.success("Gokil! Tagihan lo sudah lunas semua bro!");
      }

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal ambil data tagihan!");
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ LOGIC QRIS DANA ASLI (Ambil dari folder public/qris/)
  const getQRISImage = (amount: number) => {
    if (amount === 5000) return "/qris/qris-5k.jpg";
    if (amount === 10000) return "/qris/qris-10k.jpg";
    if (amount === 15000) return "/qris/qris-15k.jpg";
    if (amount === 20000) return "/qris/qris-20k.jpg";
    
    // 🚨 ELSE: Jika lebih dari 20k, pakai QRIS bebas nominal
    return "/qris/qris-dana-all-nominal.jpg";
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bayar Tagihan Kas</h1>
        <p className="text-muted-foreground mt-1">Masukkan NIM untuk cek dan bayar iuran mingguan</p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-border bg-card/50 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input 
              placeholder="Masukkan NIM (Contoh: 1512625004)" 
              className="pl-10 h-12 bg-background/50 border-primary/20 focus-visible:ring-primary rounded-xl w-full"
              value={nim}
              onChange={(e) => setNim(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCheckBill()}
            />
          </div>
          <Button 
            className="h-12 px-8 bg-primary/80 hover:bg-primary text-primary-foreground rounded-2xl font-medium transition-all min-w-[160px]" 
            onClick={handleCheckBill} 
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Cek Tagihan Kas"}
          </Button>
        </div>
      </div>

      {studentData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="glass-card p-6 rounded-2xl border border-border bg-card">
            <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
               <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                 <Wallet className="text-primary w-6 h-6" />
               </div>
               <div>
                 <h3 className="font-bold text-lg">{studentData.full_name}</h3>
                 <p className="text-sm text-muted-foreground">NIM: {studentData.nim}</p>
               </div>
            </div>

            <div className="space-y-3 mb-6">
              <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Detail Tagihan yang Belum Dibayar</h4>
              {unpaidWeeks.length > 0 ? (
                unpaidWeeks.map((item) => (
                  <div key={item.week} className="flex justify-between items-center p-4 bg-muted/30 rounded-xl border border-border/50">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">Iuran Minggu ke-{item.week}</span>
                      {item.status === 'Pending' && (
                        <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-0.5 rounded-full w-fit mt-1 italic">Menunggu Verifikasi Bendahara</span>
                      )}
                    </div>
                    <span className="text-sm font-bold text-destructive/80">Rp 5.000</span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-6 text-green-500 bg-green-500/5 rounded-2xl border border-green-500/20">
                  <CheckCircle2 className="w-10 h-10 mb-2" />
                  <p className="font-bold">Lunas Terus, Mantap!</p>
                </div>
              )}
            </div>

            {totalBill > 0 && (
              <div className="pt-6 border-t border-border space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1 uppercase font-bold tracking-tighter">Total Tagihan:</p>
                    <p className="text-3xl font-black text-primary">
                      {formatRupiah(totalBill)}
                    </p>
                  </div>
                  <Button onClick={() => setShowQRIS(true)} className="bg-primary hover:scale-105 transition-transform rounded-xl px-6 py-2 h-auto">
                    Bayar Sekarang
                  </Button>
                </div>
              </div>
            )}
          </div>

          {showQRIS && totalBill > 0 && (
            <div className="glass-card p-8 rounded-2xl border-2 border-primary/20 bg-card flex flex-col items-center animate-in zoom-in-95 duration-300">
               <h3 className="font-bold text-xl mb-1 text-center">Pembayaran QRIS Dana</h3>
               <p className="text-sm text-muted-foreground mb-6 text-center">Scan & Bayar Sebesar <span className="font-bold text-foreground">{formatRupiah(totalBill)}</span></p>
               
               <div className="bg-white p-4 rounded-2xl shadow-xl mb-6 border-4 border-primary/10">
                 <img src={getQRISImage(totalBill)} alt="QRIS" className="w-64 h-64 object-contain" />
               </div>

               <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-xl flex gap-3 items-start max-w-sm">
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Jangan lupa simpan bukti bayar dan kirim ke Bendahara buat update status di Dashboard ya!
                  </p>
               </div>
               
               <Button variant="ghost" className="mt-6 text-muted-foreground hover:text-foreground" onClick={() => setShowQRIS(false)}>Ganti NIM / Tutup</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);