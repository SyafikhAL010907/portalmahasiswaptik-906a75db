import { useState, useEffect } from 'react';
import { Search, Wallet, CreditCard, AlertCircle, CheckCircle2, Loader2, Calendar, X } from 'lucide-react';
import { useBillingConfig } from '@/hooks/useBillingConfig';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn, formatIDR } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { PaymentNotificationCenter } from '@/components/dashboard/PaymentNotificationCenter';

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
  const [selectedWeeks, setSelectedWeeks] = useState<string[]>([]);
  const [paymentAmount, setPaymentAmount] = useState(0);

  // Auth context for strict isolation
  const { profile, roles: userRoles } = useAuth();
  const isMahasiswa = userRoles.includes('mahasiswa');

  // Auto-Revert Logic States
  const [timeLeft, setTimeLeft] = useState(0);
  const [pendingVerifyItems, setPendingVerifyItems] = useState<any[]>([]); // Items currently being paid

  // 1. POLLING BILLING CONFIG (REAL-TIME) - Using Hook
  const { billingStart, billingEnd } = useBillingConfig();

  // Create activePeriod derived state wrapper for compatibility with existing code
  const [activePeriod, setActivePeriod] = useState<{ start: number, end: number } | null>(null);

  useEffect(() => {
    if (billingStart && billingEnd) {
      setActivePeriod({ start: billingStart, end: billingEnd });
    }
  }, [billingStart, billingEnd]);

  // 2. RESTORE SESSION FROM LOCAL STORAGE ON MOUNT (STRICT)
  useEffect(() => {
    const restoreSession = async () => {
      // 1. Initial Reset for Mahasiswa
      if (isMahasiswa && profile?.nim) {
        setNim(profile.nim);
        fetchStudentData(profile.nim, true);
      }

      const savedSession = localStorage.getItem('payment_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);

          // STRICT: Verify NIM matches current user
          if (profile?.nim && session.nim !== profile.nim) {
            console.warn("🔐 Payment Isolation: Session NIM mismatch. Purging.");
            localStorage.removeItem('payment_session');
            return;
          }

          // Calculate remaining time
          const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
          const remaining = 60 - elapsedSeconds;

          if (remaining > 0) {
            // Restore state IMMEDIATELY
            setPendingVerifyItems(session.items);
            setPaymentAmount(session.amount);
            setTimeLeft(remaining);
            setNim(session.nim);

            // Restore student data immediately for UI
            setStudentData(session.studentData);

            // Background Sync: Update data without resetting critical state
            if (session.nim) {
              await fetchStudentData(session.nim, false); // false = NO RESET
            }

            setShowQRIS(true);
            toast.info("Pembayaran sedang diproses. Silakan cek status di antrean konfirmasi.");
          } else {
            // Expired while away
            handleCleanupExpiredSession(session.items);
          }
        } catch (e) {
          console.error("Failed to restore session", e);
          localStorage.removeItem('payment_session');
        }
      }
    };

    restoreSession();

    // Cleanup on unmount
    return () => {
      setShowQRIS(false);
      setTimeLeft(0);
      setPendingVerifyItems([]);
      toast.dismiss();
    };
  }, [profile?.nim]);

  // Helper to clean up expired session immediately on load
  const handleCleanupExpiredSession = async (items: any[]) => {
    localStorage.removeItem('payment_session');
    if (items && items.length > 0) {
      // Revert logic
      await revertItems(items);
      toast.error("Waktu pembayaran habis! Status pending telah dibatalkan otomatis.");
    }
  };


  // 3. REACTIVE BILL CALCULATION
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

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (showQRIS) {
      interval = setInterval(() => {
        // EXTRA SAFETY: If UI is closed, kill timer immediately
        if (!showQRIS) {
          clearInterval(interval);
          return;
        }

        const savedSession = localStorage.getItem('payment_session');
        if (savedSession) {
          const session = JSON.parse(savedSession);
          const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
          const remaining = 60 - elapsed;

          if (remaining <= 0) {
            setTimeLeft(0);
            clearInterval(interval);
            cancelPayment('timeout'); // Unified
          } else {
            setTimeLeft(remaining);
          }
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [showQRIS]);

  // 5. REAL-TIME SUCCESS & UI UPDATE (JALUR GANDA: DATABASE & CUSTOM EVENT)
  useEffect(() => {
    // 🚀 1. JALUR PINTAS: Nangkep sinyal langsung dari tombol X di komponen Antrean
    const handleForceClose = () => {
      console.log("🚨 Tombol di Antrean diklik! Paksa tutup QR...");
      handleManualClose(); // <--- INI FUNGSI NUTUPNYA
    };
    window.addEventListener('force-close-qr', handleForceClose);

    if (!studentData?.user_id) {
      return () => window.removeEventListener('force-close-qr', handleForceClose);
    }

    // 🚀 2. JALUR DATABASE: Pantau tabel profiles (Karena Antrean pasti update status user di sini)
    const profileChannel = supabase
      .channel(`profile_kill_switch_${studentData.user_id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${studentData.user_id}` },
        (payload) => {
          const updated = payload.new as any;
          if (updated.payment_status === 'paid' || updated.payment_status === 'unpaid') {
            handleManualClose();
            if (updated.payment_status === 'paid') toast.success("PEMBAYARAN LUNAS!");
          }
        }
      ).subscribe();

    // 🚀 3. JALUR DATABASE: Pantau weekly_dues (Sekarang Auto-Refresh Rincian)
    const duesChannel = supabase
      .channel(`dues_kill_switch_${studentData.user_id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'weekly_dues', filter: `student_id=eq.${studentData.user_id}` },
        (payload) => {
          console.log("🔄 Realtime Update Diterima:", payload.eventType);

          // 🔥 1. SINKRONISASI INSTAN (Ubah tampilan UI detik ini juga)
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updated = payload.new as any;
            // Langsung ubah warna kuning/merah/hilang sesuai status baru
            setRawDues(prev => prev.map(d =>
              (d.month === updated.month && d.week_number === updated.week_number)
                ? { ...d, status: updated.status }
                : d
            ));
          } else if (payload.eventType === 'DELETE' && payload.old) {
            const deleted = payload.old as any;
            // Kalau data antrean dihapus (Ditolak Admin), balikin otomatis jadi hutang merah ('unpaid')
            setRawDues(prev => prev.map(d =>
              (d.month === deleted.month && d.week_number === deleted.week_number)
                ? { ...d, status: 'unpaid' }
                : d
            ));
          }

          // 🔥 2. EKSEKUSI SUNTIK MATI QR (Tutup Panel)
          const status = payload.new ? (payload.new as any).status : null;
          if (payload.eventType === 'DELETE' || status === 'paid' || status === 'unpaid') {
            handleManualClose();
          }

          // 🔥 3. Backup sync dari server diem-diem
          fetchStudentData(nim, false);
        }
      ).subscribe();
    return () => {
      window.removeEventListener('force-close-qr', handleForceClose);
      supabase.removeChannel(profileChannel);
      supabase.removeChannel(duesChannel);
    };
  }, [studentData?.user_id, nim]);

  const handlePaymentSuccess = (confirmedRecord?: any) => {
    // 🛑 1. STOP TIMER & TUTUP QR DETIK INI JUGA
    setShowQRIS(false);
    setTimeLeft(0);

    // 🛑 2. HAPUS SEMUA JEJAK SESI
    localStorage.removeItem('payment_session');
    setPendingVerifyItems([]);

    // 🛑 3. BERSIHKAN NOTIFIKASI
    toast.dismiss();
    toast.success("PEMBAYARAN LUNAS! QR ditutup otomatis.", {
      icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
    });
  };
  // Revert Logic refactored to be reusable
  const revertItems = async (items: any[]) => {
    if (!items || items.length === 0) return;

    const studentId = items[0].student_id;

    // 1. Check if ALREADY PAID before reverting
    const { data, error: fetchError } = await supabase
      .from('weekly_dues')
      .select('*')
      .eq('student_id', studentId)
      .in('status', ['paid', 'pending']);

    const latestDues = data as any[];

    if (fetchError) {
      console.error("Error checking status:", fetchError);
      return;
    }

    // Check if any of our pending items are now PAID
    const actuallyPaidItems = latestDues?.filter(d =>
      items.some(p => p.month === d.month && p.week_number === d.week_number && d.status === 'paid')
    ) || [];

    if (actuallyPaidItems.length === items.length) {
      // Success!
      return true; // Indicates success
    }

    // Revert valid items
    const itemsToRevert = items.filter(p => {
      const latest = latestDues?.find(d => d.month === p.month && d.week_number === p.week_number);
      // Restore if it is still pending or missing (invalid state)
      return !latest || latest.status === 'pending';
    });

    if (itemsToRevert.length > 0) {
      const updates = itemsToRevert.map(curr => ({
        student_id: curr.student_id,
        month: curr.month,
        week_number: curr.week_number,
        year: curr.year,
        status: 'unpaid',
        amount: 5000
      }));

      const { error: revertError } = await supabase
        .from('weekly_dues')
        .upsert(updates, { onConflict: 'student_id, month, week_number, year' });

      if (revertError) throw revertError;
      return false; // Indicates reverted
    }
    return true; // Nothing to revert (maybe partial?)
  };

  const cancelPayment = async (reason: 'timeout' | 'manual' = 'manual') => {
    // 1. INSTANT UI CLEANUP (Requirement 1 & 3)
    setShowQRIS(false);
    setTimeLeft(0);
    setPendingVerifyItems([]);
    localStorage.removeItem('payment_session');

    // 2. OPTIMISTIC LOCAL STATE UPDATE
    setRawDues(prev => prev.map(d =>
      d.status === 'pending' ? { ...d, status: 'unpaid' } : d
    ));

    // 3. BACKGROUND DATABASE SYNC (Direct Update for instant sync)
    // We update profiles table first to trigger global auto-reset for other tabs/listeners
    if (studentData?.id) {
      await (supabase as any)
        .from('profiles')
        .update({
          payment_status: 'unpaid',
          payment_expires_at: null
        })
        .eq('id', studentData.id);
    }

    // 4. REVERT WEEKLY DUES (Lazy background sync)
    let itemsToProcess = pendingVerifyItems;
    if (itemsToProcess.length === 0) {
      const savedSession = localStorage.getItem('payment_session');
      if (savedSession) {
        itemsToProcess = JSON.parse(savedSession).items;
      }
    }

    if (itemsToProcess.length > 0) {
      revertItems(itemsToProcess).catch(err => console.error("Background revert failed:", err));
    }

    if (reason === 'timeout') {
      toast.info("Waktu pembayaran telah habis.", { duration: 3000 });
    } else {
      toast.success("Pembayaran dibatalkan.");
    }
  };

  const handleAutoCancel = () => cancelPayment('timeout');
  const handleManualCancel = () => {
    // Buttons 'Selesai' and 'X' now only hide the UI
    setShowQRIS(false);
  };

  const handleCancelSingleItem = async (month: number, week: number) => {
    // Optimistic Update
    setRawDues(prev => prev.map(d =>
      (d.month === month && d.week_number === week) ? { ...d, status: 'unpaid' } : d
    ));

    try {
      const { error } = await (supabase as any)
        .from('weekly_dues')
        .update({ status: 'unpaid' })
        .eq('student_id', studentData.user_id)
        .eq('month', month)
        .eq('week_number', week)
        .eq('year', new Date().getFullYear());

      if (error) throw error;
      toast.success(`Berhasil membatalkan Item Minggu ${week}`);

      // KILL-SWITCH LOKAL (Sesuai Request: Tombol X juga harus matikan QR)
      handleManualClose();

    } catch (err: any) {
      console.error("Cancel single item error:", err);
      toast.error("Gagal membatalkan item.");
      // Rollback
      if (nim) fetchStudentData(nim, false);
    }
  };

  const handleManualClose = () => {
    // Force stop segalanya sesuai request
    setShowQRIS(false);
    setTimeLeft(0);
    localStorage.removeItem('payment_session');
    setPendingVerifyItems([]);
    toast.dismiss();
    console.log("Sesi dimatikan manual oleh user.");
  };

  // Separated Fetch Logic
  async function fetchStudentData(nimToFetch: string, shouldReset: boolean = true) {
    setIsLoading(true);

    if (shouldReset) {
      setStudentData(null);
      setRawDues([]);
      setUnpaidWeeks([]);
      setTotalBill(0);
      setIsBelumBayar(false);
      setSelectedWeeks([]);
      // Do NOT reset showQRIS here, handled by caller
    }

    try {
      // 1. Fetch profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, nim, class_id')
        .eq('nim', nimToFetch)
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) {
        if (shouldReset) toast.error("NIM tidak ditemukan!");
        return;
      }

      // STRICT ISOLATION: Mahasiswa can only fetch their own data
      if (isMahasiswa && profile.nim !== nimToFetch) {
        console.error("🔐 Payment Isolation: unauthorized fetch attempt blocked.");
        toast.error("Anda hanya dapat melihat data tagihan Anda sendiri!");
        if (shouldReset) setNim(userRoles.includes('mahasiswa') ? (useAuth().profile?.nim || '') : '');
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

      const newStudentData = {
        ...profile,
        classLetter,
        classes: { name: className }
      };

      setStudentData(newStudentData);

      // 3. Fetch Dues
      const currentYear = new Date().getFullYear();
      const { data, error: duesError } = await supabase
        .from('weekly_dues')
        .select('*')
        .eq('student_id', profile.user_id)
        .eq('year', currentYear);

      if (duesError) throw duesError;

      setRawDues(data || []);

    } catch (error: any) {
      console.error(error);
      if (shouldReset) toast.error("Gagal memuat data: " + error.message);
    } finally {
      setIsLoading(false);
    }
  }


  async function handleCheckBill() {
    const cleanNim = nim.trim();
    if (!cleanNim) {
      toast.error("Masukkan NIM dulu bro!");
      return;
    }
    // Force close QRIS on manual check if active? Maybe not needed if logic handles valid flow.
    // If user manually checks another NIM, we should probably reset session?
    // STRICT: Only reset session if user explicitly closed or time ran out. 
    // BUT if check bill is clicked, it implies new search.
    // Let's assume manual check implies "Start Over".
    setShowQRIS(false);
    // localStorage.removeItem('payment_session'); // Maybe? Or keep it? 
    // Requirement says "User tidak boleh menutup panel... kecuali tombol Selesai". 
    // Check Bill button is "outside" panel. 
    // If panel is open, user can't click Check Bill easily (modal overlay).

    await fetchStudentData(cleanNim, true);
  };


  const handleToggleWeek = (id: string) => {
    setSelectedWeeks(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const selectedTotal = selectedWeeks.length * 5000;

  const handlePayNow = async () => {
    // 1. Validasi
    if (!studentData || selectedWeeks.length === 0 || selectedTotal === 0) {
      toast.error("Silakan pilih minimal satu minggu yang ingin dibayar terlebih dahulu!");
      return;
    }

    setIsPaying(true);
    setPaymentAmount(selectedTotal);
    try {
      const currentYear = new Date().getFullYear();

      // Filter only selected weeks
      const selectedItems = unpaidWeeks.filter(bill =>
        selectedWeeks.includes(`${bill.month}-${bill.week}`)
      );

      const updates = selectedItems.map(bill => ({
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

      // 2. Update Profile status and expiry (Server-side)
      const expiresAt = new Date(Date.now() + 65 * 1000).toISOString(); // 65s for buffer
      const { error: profileError } = await (supabase as any)
        .from('profiles')
        .update({
          payment_status: 'pending',
          payment_expires_at: expiresAt
        })
        .eq('id', studentData.id);

      if (profileError) throw profileError;

      toast.success("Tagihan dibuat! Silakan scan QR di bawah.");

      // Setup Strict Session & Timer
      const sessionData = {
        startTime: Date.now(),
        items: updates,
        amount: selectedTotal,
        studentData: studentData,
        nim: nim
      };
      localStorage.setItem('payment_session', JSON.stringify(sessionData));

      setPendingVerifyItems(updates);
      setTimeLeft(60);
      setShowQRIS(true);

      setSelectedWeeks([]);

      setUnpaidWeeks(prev => prev.map(w =>
        selectedWeeks.includes(`${w.month}-${w.week}`) ? { ...w, status: 'pending' } : w
      ));

      // Local update for immediate feedback
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
    const sanitizedClass = (classLetter || 'A').toUpperCase();
    const folder = `Qris${sanitizedClass}`;

    let filename = 'qris-dana-all-nominal.jpg';

    if (amount === 5000) filename = 'qris-5k.jpg';
    else if (amount === 10000) filename = 'qris-10k.jpg';
    else if (amount === 15000) filename = 'qris-15k.jpg';
    else if (amount === 20000) filename = 'qris-20k.jpg';

    return `/${folder}/${filename}`;
  };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <PaymentNotificationCenter />
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
            className="h-12 px-8 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-purple-500/50 hover:-translate-y-0.5 active:scale-95 min-w-[160px] border-none"
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
                  {unpaidWeeks.map((item, idx) => {
                    const uniqueId = `${item.month}-${item.week}`;
                    const isDisabled = item.status === 'pending';

                    return (
                      <div key={`${item.month}-${item.week}-${idx}`} className="flex justify-between items-center p-4 bg-muted/20 hover:bg-muted/40 rounded-xl border border-border/50 transition-all group">
                        <div className="flex items-center gap-4">
                          {!isDisabled && (
                            <Checkbox
                              id={`cb-${uniqueId}`}
                              checked={selectedWeeks.includes(uniqueId)}
                              onCheckedChange={() => handleToggleWeek(uniqueId)}
                              className="w-5 h-5 border-2 border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                            />
                          )}
                          <div className="flex flex-col gap-0.5">
                            <label
                              htmlFor={`cb-${uniqueId}`}
                              className={cn(
                                "text-sm font-semibold transition-colors cursor-pointer",
                                isDisabled ? "opacity-50 cursor-not-allowed" : "group-hover:text-primary"
                              )}
                            >
                              {MONTH_NAMES[item.month]} - Minggu {item.week}
                            </label>
                            {item.status === 'pending' ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md w-fit italic">
                                  Menunggu Konfirmasi
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-5 w-5 text-rose-500 hover:bg-rose-500/20"
                                  onClick={() => handleCancelSingleItem(item.month, item.week)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-[10px] text-rose-500 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md w-fit italic">
                                Hutang Belum Terbayar
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-black text-rose-600">Rp 5.000</span>
                      </div>
                    );
                  })}
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
                      <p className="text-[10px] text-primary/70 uppercase font-black tracking-tighter mb-1">Total Yang Dipilih:</p>
                      <p className="text-4xl font-black text-primary tracking-tight">
                        {formatIDR(selectedTotal)}
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handlePayNow}
                    disabled={isPaying || selectedTotal === 0}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-14 rounded-xl font-bold text-lg shadow-md shadow-purple-500/20 transition-all duration-300 ease-in-out hover:shadow-lg hover:shadow-purple-500/50 hover:-translate-y-0.5 active:scale-95 w-full border-none"
                  >
                    {isPaying ? <Loader2 className="animate-spin w-6 h-6 mr-2" /> : <CreditCard className="w-6 h-6 mr-2 text-white" />}
                    BAYAR SEKARANG
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: QRIS Result */}
          {showQRIS && (
            <div className="glass-card p-8 rounded-2xl border-2 border-primary/30 bg-card flex flex-col items-center animate-in slide-in-from-right-4 fade-in duration-300 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Wallet className="w-32 h-32" />
              </div>

              <div className="w-full flex justify-between items-center mb-8 border-b border-border pb-4 z-10">
                <div className="flex flex-col">
                  <h3 className="font-black text-2xl tracking-tight">QRIS Dana {studentData.classLetter}</h3>
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">PTIK Portal Official Payment</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-primary text-primary-foreground px-3 py-1.5 rounded-full font-black uppercase tracking-tighter shadow-sm">Verified</span>
                  {/* ADMIN-ONLY CLOSE: Manual 'X' removed */}
                </div>
              </div>

              <div className="text-center mb-8 z-10">
                <p className="text-sm font-bold text-muted-foreground">Silakan Scan & Bayar Sejumlah</p>
                <p className="text-4xl font-black text-foreground tracking-tighter mt-1">{formatIDR(paymentAmount)}</p>
              </div>

              <div className="bg-white p-5 rounded-3xl shadow-2xl mb-8 border-8 border-primary/5 relative group transition-transform hover:scale-[1.02] duration-500">
                <img
                  src={getQRISImage(studentData.classLetter, paymentAmount)}
                  alt="QRIS"
                  className="w-64 h-64 object-contain"
                />
              </div>

              {/* --- MANUAL TRANSFER SECTION --- */}
              <div className="w-full max-w-sm bg-muted/30 border border-border/50 rounded-2xl p-5 mb-8 z-10 animate-in fade-in slide-in-from-bottom-2 duration-700">
                <p className="text-center text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">
                  Atau Transfer Manual:
                </p>

                {(() => {
                  const classLetter = (studentData.classLetter || 'A').toUpperCase();
                  const transferMap: Record<string, { provider: string, number: string, color: string, bgColor: string, borderColor: string }> = {
                    'A': { provider: 'DANA', number: '08568025001', color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
                    'B': { provider: 'GOPAY', number: '08568025002', color: 'text-emerald-600', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/20' },
                    'C': { provider: 'OVO', number: '08568025003', color: 'text-purple-600', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/20' },
                    'D': { provider: 'DANA', number: '08568025004', color: 'text-blue-600', bgColor: 'bg-blue-500/10', borderColor: 'border-blue-500/20' },
                  };

                  const info = transferMap[classLetter] || transferMap['A'];

                  return (
                    <div className={cn("flex flex-col items-center p-4 rounded-xl border transition-all hover:scale-[1.01]", info.bgColor, info.borderColor)}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={cn("px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter border", info.color, info.borderColor.replace('20', '30'))}>
                          {info.provider}
                        </div>
                      </div>
                      <p className={cn("text-2xl md:text-3xl font-black tracking-tight", info.color)}>
                        {info.number}
                      </p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        a/n Bendahara {studentData.classes?.name || `Kelas ${classLetter}`}
                      </p>
                    </div>
                  );
                })()}
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



              {/* Countdown Timer & Warning */}
              <div className="w-full text-center space-y-2 mb-6 animate-pulse">
                <p className="text-rose-500 font-black text-lg">
                  Sisa Waktu: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
                </p>
                <p className="text-xs text-muted-foreground">
                  Segera lakukan pembayaran dan lapor bendahara! <br />
                  Jika waktu habis, status pending akan <span className="text-rose-500 font-bold">dibatalkan otomatis</span>.
                </p>
              </div>

              <div className="flex flex-col w-full gap-3">
                <p className="text-[10px] text-center text-muted-foreground italic opacity-70">
                  Menunggu Konfirmasi Admin...
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div >
  );
}


// formatRupiah removed and replaced by formatIDR from utils.ts