import { useState } from 'react';
import { Search, Wallet, CreditCard, AlertCircle, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BillDetail {
  month: number;
  week: number;
  status: string;
}

const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function Payment() {
  const [nim, setNim] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [isBelumBayar, setIsBelumBayar] = useState(false);
  const [studentData, setStudentData] = useState<any>(null);
  const [unpaidWeeks, setUnpaidWeeks] = useState<BillDetail[]>([]);
  const [totalBill, setTotalBill] = useState(0);
  const [showQRIS, setShowQRIS] = useState(false);

  const handleCheckBill = async () => {
    const cleanNim = nim.trim();
    if (!cleanNim) {
      toast.error("Masukkan NIM dulu bro!");
      return;
    }

    setIsLoading(true);
    setStudentData(null);
    setUnpaidWeeks([]);
    setTotalBill(0);
    setShowQRIS(false);
    setIsBelumBayar(false);

    try {
      // 1. Fetch profile first (Split query for robustness)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim, class_id')
        .eq('nim', cleanNim)
        .maybeSingle();

      if (profileError) {
        console.error("Profile Fetch Error:", profileError);
        throw profileError;
      }

      if (!profile) {
        toast.error("NIM tidak ditemukan! Pastikan mahasiswa terdaftar di User Management.");
        setIsLoading(false);
        return;
      }

      // 2. Fetch class name if exists
      let classLetter = 'A'; // Default
      let className = 'Kelas A';

      if (profile.class_id) {
        const { data: classData } = await supabase
          .from('classes')
          .select('name')
          .eq('id', profile.class_id)
          .maybeSingle();

        if (classData?.name) {
          className = `Kelas ${classData.name}`;
          classLetter = classData.name.replace('Kelas ', '').trim();
        }
      }

      setStudentData({
        ...profile,
        classLetter,
        classes: { name: className }
      });

      // 3. Fetch all dues records for the current year
      const currentYear = new Date().getFullYear();
      const { data: duesData, error: duesError } = await (supabase.from('weekly_dues') as any)
        .select('month, week_number, status, amount')
        .eq('student_id', profile.user_id)
        .eq('year', currentYear);

      if (duesError) throw duesError;

      // 4. Calculate Total Paid and Arrears (Status Based Sync)
      const paidRecords = duesData?.filter((d: any) => d.status === 'paid') || [];
      const totalPaidAmount = paidRecords.reduce((sum: number, d: any) => sum + (d.amount || 0), 0);

      const arrears: BillDetail[] = [];

      // Logic: Only consider months that have at least ONE 'paid' or 'pending' record.
      // This eliminates "ghost months" like future months or accidental entries with no status.
      const activeMonths = Array.from(new Set(duesData?.filter((d: any) => d.status === 'paid' || d.status === 'pending').map((d: any) => d.month as number) || [])) as number[];

      // CASE: Belum Bayar (0 Paid Records)
      if (totalPaidAmount === 0 && activeMonths.length === 0) {
        setIsBelumBayar(true);
        arrears.push({
          month: 1, // Default to Januari
          week: 1,  // Default to Minggu 1
          status: 'unpaid'
        });
      } else {
        // CASE: Partial Payments or Pending - Filter months with deficiencies
        activeMonths.forEach((m: number) => {
          const monthRecords = duesData?.filter((d: any) => d.month === m) || [];
          const paidInMonth = monthRecords.filter((d: any) => d.status === 'paid').length;

          // Deficiency found if paid weeks in that month < 4
          if (paidInMonth < 4) {
            for (let w = 1; w <= 4; w++) {
              const record = monthRecords.find((d: any) => d.week_number === w);
              if (!record || record.status === 'unpaid' || record.status === 'pending') {
                arrears.push({
                  month: m,
                  week: w,
                  status: record?.status || 'unpaid'
                });
              }
            }
          }
        });
      }

      const sortedArrears = arrears.sort((a, b) => (a.month * 10 + a.week) - (b.month * 10 + b.week));

      setUnpaidWeeks(sortedArrears);
      setTotalBill(sortedArrears.length * 5000);

      // Success logic: MUST have paid something AND zero deficiencies
      const isActuallyLunas = totalPaidAmount > 0 && sortedArrears.length === 0;

      if (isActuallyLunas) {
        toast.success("Gokil! Tagihan lo sudah lunas semua bro!");
      }

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal ambil data tagihan: " + (error.message || "Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!studentData || unpaidWeeks.length === 0) return;

    setIsPaying(true);
    try {
      const currentYear = new Date().getFullYear();
      const updates = unpaidWeeks
        .filter(b => b.status === 'unpaid')
        .map(bill => ({
          student_id: studentData.user_id,
          month: bill.month,
          week_number: bill.week,
          status: 'pending',
          year: currentYear,
          amount: 5000
        }));

      if (updates.length > 0) {
        const { error } = await (supabase.from('weekly_dues') as any)
          .upsert(updates, { onConflict: 'student_id, month, week_number, year' });

        if (error) throw error;
      }

      toast.success("Status pembayaran diubah ke 'Pending'. Segera kirim bukti bayar ya!");
      setShowQRIS(true);

      // Refresh local UI to show everything as pending
      setUnpaidWeeks(prev => prev.map(w => ({ ...w, status: 'pending' })));

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal update status pembayaran!");
    } finally {
      setIsPaying(false);
    }
  };

  const getQRISImage = (classLetter: string, amount: number) => {
    const folder = `Qris${classLetter}`;
    const filename = amount === 5000 ? 'qris-5k.jpg' :
      amount === 10000 ? 'qris-10k.jpg' :
        amount === 15000 ? 'qris-15k.jpg' :
          amount === 20000 ? 'qris-20k.jpg' : 'qris-dana-all-nominal.jpg';

    // Path correctly mapped to public folder
    return `/Qris${classLetter}/${filename}`;
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="animate-in fade-in duration-200">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bayar iuranTagihan Kas</h1>
        <p className="text-muted-foreground mt-1">Sesuai data Matrix Iuran Mahasiswa</p>
      </div>

      <div className="glass-card p-6 rounded-2xl border border-border bg-card/50 shadow-sm animate-in fade-in duration-200">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Masukkan NIM Mahasiswa"
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
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : "Cek Detail Tagihan"}
          </Button>
        </div>
      </div>

      {studentData && (
        <div
          key={studentData.user_id}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200"
        >
          <div className="glass-card p-6 rounded-2xl border border-border bg-card shadow-lg">
            <div className="flex items-center gap-4 mb-6 border-b border-border pb-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
                <Wallet className="text-primary w-7 h-7" />
              </div>
              <div>
                <h3 className="font-bold text-xl">{studentData.full_name}</h3>
                <p className="text-sm text-muted-foreground">NIM: {studentData.nim} • {studentData.classes?.name || `Kelas ${studentData.classLetter}`}</p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-primary" /> Detail Tagihan
                </h4>
                {unpaidWeeks.length > 0 && (
                  <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                    {isBelumBayar ? 0 : unpaidWeeks.length} Item
                  </span>
                )}
              </div>

              {unpaidWeeks.length > 0 ? (
                isBelumBayar ? (
                  <div className="flex flex-col items-center py-10 text-amber-500 bg-amber-500/5 rounded-2xl border border-amber-500/20 animate-in zoom-in duration-300">
                    <AlertCircle className="w-12 h-12 mb-3 drop-shadow-sm" />
                    <p className="font-black text-lg text-amber-600">Belum Ada Riwayat Bayar</p>
                    <p className="text-xs text-muted-foreground mt-1 px-6 text-center">Silakan lakukan pembayaran iuran pertama untuk memulai kontribusi Anda.</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {unpaidWeeks.map((item) => (
                      <div key={`${item.month}-${item.week}`} className="flex justify-between items-center p-4 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/50 transition-all group">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                            {MONTH_NAMES[item.month]} - Minggu {item.week}
                          </span>
                          {item.status === 'pending' ? (
                            <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md w-fit italic">
                              Menunggu Konfirmasi Admin
                            </span>
                          ) : (
                            <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md w-fit italic">
                              Hutang Belum Terbayar
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-black text-rose-600">Rp 5.000</span>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center py-10 text-blue-500 bg-blue-500/5 rounded-2xl border border-blue-500/20 animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-12 h-12 mb-3 drop-shadow-sm" />
                  <p className="font-black text-lg">Semua Tagihan Lunas!</p>
                  <p className="text-xs text-muted-foreground mt-1 px-6 text-center">Terima kasih atas partisipasinya bro. Data Matrix Anda sudah aman!</p>
                </div>
              )}
            </div>

            {totalBill > 0 && (
              <div className="pt-6 border-t border-border mt-auto">
                <div className="flex flex-col space-y-4">
                  <div className="flex justify-between items-end bg-primary/5 p-4 rounded-xl border border-primary/10">
                    <div>
                      <p className="text-[10px] text-primary/70 uppercase font-black tracking-tighter mb-1">Total Akumulasi Tagihan:</p>
                      <p className="text-4xl font-black text-primary tracking-tight">
                        {isBelumBayar ? "Rp 0" : formatRupiah(totalBill)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePayNow}
                    disabled={isPaying || !unpaidWeeks.some(w => w.status === 'unpaid')}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 rounded-xl font-black text-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  >
                    {isPaying ? <Loader2 className="animate-spin w-6 h-6 mr-2" /> : <CreditCard className="w-6 h-6 mr-2" />}
                    {isBelumBayar ? "MULAI PEMBAYARAN PERTAMA" : "BAYAR SEKARANG"}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {showQRIS && totalBill > 0 && (
            <div className="glass-card p-8 rounded-2xl border-2 border-primary/30 bg-card flex flex-col items-center animate-in slide-in-from-right-4 fade-in duration-300 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wallet className="w-32 h-32" />
              </div>

              <div className="w-full flex justify-between items-center mb-8 border-b border-border pb-4 z-10">
                <div className="flex flex-col">
                  <h3 className="font-black text-2xl tracking-tight">QRIS Dana {studentData.classLetter}</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">PTIK Portal Official Payment</p>
                </div>
                <span className="text-[10px] bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-black uppercase tracking-tighter shadow-sm">Verified</span>
              </div>

              <div className="text-center mb-8 z-10">
                <p className="text-sm font-bold text-muted-foreground">Silakan Scan & Bayar Sejumlah</p>
                <p className="text-4xl font-black text-foreground tracking-tighter mt-1">{formatRupiah(totalBill)}</p>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-2xl mb-8 border-8 border-primary/5 relative group transition-transform hover:scale-[1.02] duration-500">
                <img
                  src={getQRISImage(studentData.classLetter, totalBill)}
                  alt="QRIS"
                  className="w-64 h-64 object-contain"
                />
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl flex gap-4 items-start max-w-sm mb-8 z-10">
                <div className="bg-amber-500/20 p-2 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                </div>
                <div>
                  <p className="text-xs text-amber-800 font-bold leading-relaxed">
                    Sistem sudah mencatat status <span className="underline italic">"Menunggu Konfirmasi"</span>.
                  </p>
                  <p className="text-[10px] text-amber-700/80 mt-1 font-medium">
                    Jangan lupa kirim screenshot bukti transfer ke WhatsApp Bendahara Kelas untuk validasi cepat!
                  </p>
                </div>
              </div>

              <Button variant="outline" className="w-full border-border/50 hover:bg-muted text-muted-foreground hover:text-foreground font-bold transition-all h-12 rounded-xl" onClick={() => setShowQRIS(false)}>
                Selesai / Tutup Panel
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const formatRupiah = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);