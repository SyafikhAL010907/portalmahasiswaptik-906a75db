import { useState, useEffect } from 'react';
import { Search, Wallet, CreditCard, AlertCircle, CheckCircle2, Loader2, Calendar } from 'lucide-react';
import { useBillingConfig } from '@/hooks/useBillingConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatIDR } from '@/lib/utils';
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
  const [rawDues, setRawDues] = useState<any[]>([]);

  // 1. POLLING BILLING CONFIG (REAL-TIME) - Using Hook
  const { billingStart, billingEnd } = useBillingConfig();

  // Create activePeriod derived state wrapper for compatibility with existing code
  const [activePeriod, setActivePeriod] = useState<{ start: number, end: number } | null>(null);

  useEffect(() => {
    if (billingStart && billingEnd) {
      setActivePeriod({ start: billingStart, end: billingEnd });
    }
  }, [billingStart, billingEnd]);

  // 2. REACTIVE BILL CALCULATION
  useEffect(() => {
    if (!activePeriod || rawDues.length === 0) return;

    const { start, end } = activePeriod;
    const arrears: BillDetail[] = [];
    let totalAccumulated = 0;

    const duesMap = new Map<string, any>();
    rawDues.forEach((d: any) => {
      duesMap.set(`${d.month}-${d.week_number}`, d);
    });

    for (let m = start; m <= end; m++) {
      for (let w = 1; w <= 4; w++) {
        const key = `${m}-${w}`;
        const record = duesMap.get(key);
        const status = record?.status;
        const isPaid = status === 'paid' || status === 'bebas';

        if (!isPaid) {
          arrears.push({
            month: m,
            week: w,
            status: status || 'unpaid'
          });
          totalAccumulated += 5000;
        }
      }
    }

    setUnpaidWeeks(arrears);
    setTotalBill(totalAccumulated);

    // Auto-update IsBelumBayar status
    const hasAnyPayment = rawDues.some((d: any) => d.status === 'paid');
    if (!hasAnyPayment && arrears.length > 0) {
      setIsBelumBayar(true);
    } else {
      setIsBelumBayar(false);
    }

  }, [activePeriod, rawDues]);


  const handleCheckBill = async () => {
    const cleanNim = nim.trim();
    if (!cleanNim) {
      toast.error("Masukkan NIM dulu bro!");
      return;
    }

    setIsLoading(true);
    setStudentData(null);
    setRawDues([]);
    setUnpaidWeeks([]);
    setTotalBill(0);
    setShowQRIS(false);
    setIsBelumBayar(false);

    try {
      // 1. Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, nim, class_id')
        .eq('nim', cleanNim)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        toast.error("NIM tidak ditemukan!");
        setIsLoading(false);
        return;
      }

      // 2. Fetch class info
      let classLetter = 'A';
      let className = 'Kelas A';
      if (profile.class_id) {
        const { data: classData } = await supabase.from('classes').select('name').eq('id', profile.class_id).maybeSingle();
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

      // 3. Fetch Dues
      const currentYear = new Date().getFullYear();
      const { data: duesData, error: duesError } = await supabase
        .from('weekly_dues')
        .select('*')
        .eq('student_id', profile.user_id)
        .eq('year', currentYear);

      if (duesError) throw duesError;

      setRawDues(duesData || []); // Triggers calculation via useEffect

    } catch (error: any) {
      console.error(error);
      toast.error("Gagal memuat data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };


  const handlePayNow = async () => {
    if (!studentData || unpaidWeeks.length === 0) return;

    setIsPaying(true);
    try {
      const currentYear = new Date().getFullYear();
      const updates = unpaidWeeks.map(bill => ({
        student_id: studentData.user_id,
        month: bill.month,
        week_number: bill.week,
        status: 'pending',
        year: currentYear,
        amount: 5000
      }));

      if (updates.length > 0) {
        const { error } = await supabase
          .from('weekly_dues')
          .upsert(updates, { onConflict: 'student_id, month, week_number, year' });

        if (error) throw error;
      }

      toast.success("Tagihan dibuat! Silakan scan QR di bawah.");
      setShowQRIS(true);

      // Optimistic update
      setUnpaidWeeks(prev => prev.map(w => ({ ...w, status: 'pending' })));
      // Also update rawDues to reflect pending status if we want to be super correct, 
      // but for now UI update is enough. 
      // Ideally we refetch dues or update rawDues state.
      // Let's update rawDues to keep consistency
      setRawDues(prev => {
        const newDues = [...prev];
        updates.forEach(u => {
          const idx = newDues.findIndex(d => d.month === u.month && d.week_number === u.week_number);
          if (idx >= 0) newDues[idx] = { ...newDues[idx], status: 'pending' };
          else newDues.push(u);
        });
        return newDues;
      });


    } catch (error: any) {
      console.error(error);
      toast.error("Gagal memproses tagihan!");
    } finally {
      setIsPaying(false);
    }
  };

  const getQRISImage = (classLetter: string, amount: number) => {
    // Dynamic QR Logic
    const sanitizedClass = (classLetter || 'A').toUpperCase();
    const folder = `Qris${sanitizedClass}`;

    let filename = 'qris-dana-all-nominal.jpg'; // Default

    if (amount === 5000) filename = 'qris-5k.jpg';
    else if (amount === 10000) filename = 'qris-10k.jpg';
    else if (amount === 15000) filename = 'qris-15k.jpg';
    else if (amount === 20000) filename = 'qris-20k.jpg';

    return `/${folder}/${filename}`;
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="animate-in fade-in duration-200">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Bayar Iuran Kas</h1>
        <p className="text-muted-foreground mt-1">Sinkronisasi Otomatis dengan Matrix Iuran</p>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-200">
          {/* Card 1: Rincian Tagihan */}
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
                  <Calendar className="w-4 h-4 text-primary" /> Rincian Item Mingguan
                </h4>
                {unpaidWeeks.length > 0 && (
                  <span className="text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-bold">
                    {unpaidWeeks.filter(w => w.status === 'unpaid').length} Item Belum Lunas
                  </span>
                )}
              </div>

              {/* Saklar Info */}
              {activePeriod && (
                <div className="mb-4 px-3 py-2 bg-muted/30 rounded-lg text-[10px] text-muted-foreground border border-border/50 flex items-center gap-2">
                  <AlertCircle className="w-3 h-3" />
                  <span>
                    Periode Tagihan Aktif: <strong className="text-foreground">{MONTH_NAMES[activePeriod.start]} - {MONTH_NAMES[activePeriod.end]}</strong>
                  </span>
                </div>
              )}

              {unpaidWeeks.length > 0 ? (
                <div className="space-y-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                  {unpaidWeeks.map((item, idx) => (
                    <div key={`${item.month}-${item.week}-${idx}`} className="flex justify-between items-center p-4 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/50 transition-all group">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-semibold group-hover:text-primary transition-colors">
                          {MONTH_NAMES[item.month]} - Minggu {item.week}
                        </span>
                        {item.status === 'pending' ? (
                          <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md w-fit italic">
                            Menunggu Konfirmasi
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
              ) : (
                <div className="flex flex-col items-center py-10 text-blue-500 bg-blue-500/5 rounded-2xl border border-blue-500/20 animate-in zoom-in duration-300">
                  <CheckCircle2 className="w-12 h-12 mb-3 drop-shadow-sm" />
                  <p className="font-black text-lg">Semua Tagihan Lunas!</p>
                  <p className="text-xs text-muted-foreground mt-1 px-6 text-center">Terima kasih atas partisipasinya bro. Data matrix aman!</p>
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
                        {formatIDR(totalBill)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePayNow}
                    disabled={isPaying || totalBill === 0}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground h-14 rounded-xl font-black text-lg shadow-lg shadow-primary/20 transition-all hover:scale-[1.01] active:scale-[0.98]"
                  >
                    {isPaying ? <Loader2 className="animate-spin w-6 h-6 mr-2" /> : <CreditCard className="w-6 h-6 mr-2" />}
                    BAYAR SEKARANG
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: QRIS Result */}
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
                <p className="text-4xl font-black text-foreground tracking-tighter mt-1">{formatIDR(totalBill)}</p>
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
                    Sistem sudah mencatat status <span className="underline italic">"Pending"</span>.
                  </p>
                  <p className="text-[10px] text-amber-700/80 mt-1 font-medium">
                    Mohon segera transfer dan kirim bukti ke Bendahara Kelas agar status berubah menjadi LUNAS.
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


// formatRupiah removed and replaced by formatIDR from utils.ts