import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useBillingConfig } from '@/hooks/useBillingConfig';

export interface BillDetail {
  month: number;
  week: number;
  status: string;
}

export const MONTH_NAMES = [
  '', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export function usePayment() {
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

  const { profile, roles: userRoles } = useAuth();
  const isMahasiswa = userRoles.includes('mahasiswa');

  const [timeLeft, setTimeLeft] = useState(0);
  const [pendingVerifyItems, setPendingVerifyItems] = useState<any[]>([]);

  const { billingStart, billingEnd } = useBillingConfig();
  const [activePeriod, setActivePeriod] = useState<{ start: number, end: number } | null>(null);

  // 1. Sync activePeriod from billing config
  useEffect(() => {
    if (billingStart && billingEnd) {
      setActivePeriod({ start: billingStart, end: billingEnd });
    }
  }, [billingStart, billingEnd]);

  // 2. REVERT LOGIC (SYNCED WITH ORIGINAL)
  const revertItems = useCallback(async (items: any[]) => {
    if (!items || items.length === 0) return;
    const studentId = items[0].student_id;
    try {
      const { data: latestDues, error: fetchError } = await (supabase.from('weekly_dues') as any).select('*').eq('student_id', studentId).in('status', ['paid', 'pending']);
      if (fetchError) return;

      const actuallyPaidItems = (latestDues as any[])?.filter(d =>
        items.some(p => p.month === d.month && p.week_number === d.week_number && d.status === 'paid')
      ) || [];

      if (actuallyPaidItems.length === items.length) return true;

      const itemsToRevert = items.filter(p => {
        const latest = (latestDues as any[])?.find(d => d.month === p.month && d.week_number === p.week_number);
        return !latest || latest.status === 'pending';
      });

      if (itemsToRevert.length > 0) {
        const updates = itemsToRevert.map(curr => ({
          student_id: curr.student_id, month: curr.month, week_number: curr.week_number,
          year: curr.year, status: 'unpaid', amount: 5000
        }));
        const { error } = await (supabase.from('weekly_dues').upsert(updates, { onConflict: 'student_id, month, week_number, year' }) as any);
        if (error) console.error("Revert DB operation failed:", error);
        else console.log("✅ Successfully reverted items to unpaid");
      }
    } catch (err) { console.error("Revert failed", err); }
  }, []);

  // 3. CANCEL LOGIC (SYNCED WITH ORIGINAL)
  const handleManualClose = useCallback(() => {
    setShowQRIS(false);
    setTimeLeft(0);
    localStorage.removeItem('payment_session');
    setPendingVerifyItems([]);
    toast.dismiss();
  }, []);

  const cancelPayment = useCallback(async (reason: 'timeout' | 'manual' = 'manual') => {
    setShowQRIS(false);
    setTimeLeft(0);
    setPendingVerifyItems([]);
    localStorage.removeItem('payment_session');
    toast.dismiss();

    if (reason === 'timeout') toast.error("Waktu pembayaran habis! Status pending telah dibatalkan otomatis.");
    else toast.success("Pembayaran dibatalkan.");

    setRawDues(prev => prev.map(d => d.status === 'pending' ? { ...d, status: 'unpaid' } : d));

    if (studentData?.id) {
      await (supabase as any).from('profiles').update({ payment_status: 'unpaid', payment_expires_at: null }).eq('id', studentData.id);
      if (pendingVerifyItems.length > 0) await revertItems(pendingVerifyItems);
    }
    // Instant local sync
    window.dispatchEvent(new Event('refresh-admin-queue'));
  }, [studentData, pendingVerifyItems, revertItems]);

  // 4. DATA FETCHING (SYNCED WITH ORIGINAL)
  const fetchStudentData = useCallback(async (targetNim: string, shouldReset: boolean = true) => {
    setIsLoading(true);
    if (shouldReset) {
      setStudentData(null); setRawDues([]); setUnpaidWeeks([]);
      setTotalBill(0); setIsBelumBayar(false); setSelectedWeeks([]);
    }

    try {
      const { data: prof, error: profileError } = await (supabase.from('profiles').select('id, user_id, full_name, nim, class_id').eq('nim', targetNim).maybeSingle() as any);
      if (profileError) throw profileError;
      if (!prof) { if (shouldReset) toast.error("NIM tidak ditemukan!"); return; }

      if (isMahasiswa && prof.nim !== targetNim) {
        toast.error("Anda hanya dapat melihat data tagihan Anda sendiri!");
        if (shouldReset) setNim('');
        return;
      }

      let classLetter = 'A';
      if (prof.class_id) {
        const { data: classData } = await (supabase.from('classes').select('name').eq('id', prof.class_id).maybeSingle() as any);
        if (classData?.name) classLetter = classData.name.replace('Kelas ', '').trim();
      }

      setStudentData({ ...prof, classLetter });
      const currentYear = new Date().getFullYear();
      const { data, error: duesError } = await (supabase.from('weekly_dues').select('*').eq('student_id', prof.user_id).eq('year', currentYear) as any);
      if (duesError) throw duesError;
      setRawDues(data || []);
    } catch (error: any) {
      if (shouldReset) toast.error("Gagal memuat data: " + error.message);
    } finally { setIsLoading(false); }
  }, [isMahasiswa]);

  // 5. SESSION RESTORATION (SYNCED WITH ORIGINAL)
  useEffect(() => {
    const restoreSession = async () => {
      const savedSession = localStorage.getItem('payment_session');
      if (savedSession) {
        try {
          const session = JSON.parse(savedSession);
          if (profile?.nim && session.nim !== profile.nim) { localStorage.removeItem('payment_session'); return; }
          const elapsedSeconds = Math.floor((Date.now() - session.startTime) / 1000);
          const remaining = 60 - elapsedSeconds;
          if (remaining > 0) {
            setPendingVerifyItems(session.items); setPaymentAmount(session.amount);
            setTimeLeft(remaining); setNim(session.nim); setStudentData(session.studentData);
            if (session.nim) await fetchStudentData(session.nim, false);
            setShowQRIS(true); toast.info("Pembayaran sedang diproses. Silakan cek status di antrean konfirmasi.");
          } else {
            localStorage.removeItem('payment_session');
            if (session.items?.length > 0) await revertItems(session.items);
            toast.error("Waktu pembayaran habis! Status pending telah dibatalkan otomatis.");
          }
        } catch (e) { localStorage.removeItem('payment_session'); }
      }
    };
    restoreSession();
    return () => { setShowQRIS(false); setTimeLeft(0); setPendingVerifyItems([]); toast.dismiss(); };
  }, [profile?.nim, fetchStudentData, revertItems]);

  // 6. REACTIVE BILL CALCULATION (SYNCED WITH ORIGINAL)
  useEffect(() => {
    if (!activePeriod || rawDues.length === 0) return;
    const { start, end } = activePeriod;
    const arrears: BillDetail[] = [];
    let totalAccumulated = 0;
    const duesMap = new Map<string, any>();
    rawDues.forEach((d: any) => duesMap.set(`${d.month}-${d.week_number}`, d));
    for (let m = start; m <= end; m++) {
      for (let w = 1; w <= 4; w++) {
        const key = `${m}-${w}`; const record = duesMap.get(key);
        const status = record?.status; const isPaid = status === 'paid' || status === 'bebas';
        if (!isPaid) { arrears.push({ month: m, week: w, status: status || 'unpaid' }); totalAccumulated += 5000; }
      }
    }
    setUnpaidWeeks(arrears); setTotalBill(totalAccumulated);
    const hasAnyPayment = rawDues.some((d: any) => d.status === 'paid');
    setIsBelumBayar(!hasAnyPayment && arrears.length > 0);
  }, [activePeriod, rawDues]);

  // 7. REALTIME KILL-SWITCH (SYNCED WITH ORIGINAL)
  useEffect(() => {
    const handleForceClose = () => { console.log("🚨 Force Close Event!"); handleManualClose(); };
    window.addEventListener('force-close-qr', handleForceClose);
    if (!studentData?.user_id) return () => window.removeEventListener('force-close-qr', handleForceClose);
    
    const profileChannel = supabase.channel(`profile_kill_switch_${studentData.user_id}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${studentData.user_id}` }, (payload) => {
        const updated = payload.new as any;
        if (updated.payment_status === 'paid' || updated.payment_status === 'unpaid') {
          handleManualClose(); if (updated.payment_status === 'paid') toast.success("PEMBAYARAN LUNAS!");
        }
      }).subscribe();

    const duesChannel = supabase.channel(`dues_kill_switch_${studentData.user_id}_${Math.random().toString(36).substring(7)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_dues', filter: `student_id=eq.${studentData.user_id}` }, (payload) => {
        console.log("🔄 Payment Real-time Update:", payload.eventType, payload.new);
        if (payload.eventType === 'UPDATE' && payload.new) {
          const updated = payload.new as any;
          setRawDues(prev => prev.map(d => (d.month === updated.month && d.week_number === updated.week_number) ? { ...d, status: updated.status } : d));
        } else if (payload.eventType === 'DELETE' && payload.old) {
          const deleted = payload.old as any;
          setRawDues(prev => prev.map(d => (d.month === deleted.month && d.week_number === deleted.week_number) ? { ...d, status: 'unpaid' } : d));
        }
        const status = payload.new ? (payload.new as any).status : null;
        if (payload.eventType === 'DELETE' || status === 'paid' || status === 'unpaid') handleManualClose();
        fetchStudentData(nim, false);
      }).subscribe();

    return () => { window.removeEventListener('force-close-qr', handleForceClose); supabase.removeChannel(profileChannel); supabase.removeChannel(duesChannel); };
  }, [studentData?.user_id, nim, handleManualClose, fetchStudentData]);

  // 8. STABLE TIMER (SYNCED WITH ORIGINAL)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (showQRIS) {
      const syncTimer = () => {
        const savedSession = localStorage.getItem('payment_session');
        if (savedSession) {
          try {
            const session = JSON.parse(savedSession);
            const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
            const remaining = 60 - elapsed;
            if (remaining <= 0) { setTimeLeft(0); cancelPayment('timeout'); return false; }
            setTimeLeft(remaining); return true;
          } catch (e) { cancelPayment('manual'); return false; }
        }
        return false;
      };
      if (syncTimer()) interval = setInterval(() => { if (!syncTimer()) clearInterval(interval); }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [showQRIS, cancelPayment]);

  const handleCheckBill = async () => {
    const cleanNim = nim.trim(); if (!cleanNim) { toast.error("Masukkan NIM dulu bro!"); return; }
    setShowQRIS(false); await fetchStudentData(cleanNim, true);
  };

  const handleToggleWeek = (id: string) => {
    setSelectedWeeks(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const handleCancelSingleItem = async (month: number, week: number) => {
    setRawDues(prev => prev.map(d => (d.month === month && d.week_number === week) ? { ...d, status: 'unpaid' } : d));
    try {
      await (supabase.from('weekly_dues') as any).update({ status: 'unpaid' }).eq('student_id', studentData.user_id).eq('month', month).eq('week_number', week).eq('year', new Date().getFullYear());
      toast.success(`Berhasil membatalkan Item Minggu ${week}`); handleManualClose();
    } catch (err) { toast.error("Gagal membatalkan item."); if (nim) fetchStudentData(nim, false); }
  };

  const handlePayNow = async () => {
    const selectedTotal = selectedWeeks.length * 5000;
    if (!studentData || selectedWeeks.length === 0 || selectedTotal === 0) { toast.error("Pilih minimal satu minggu!"); return; }
    setIsPaying(true); setPaymentAmount(selectedTotal);
    try {
      const currentYear = new Date().getFullYear();
      const selectedItems = unpaidWeeks.filter(bill => selectedWeeks.includes(`${bill.month}-${bill.week}`));
      const updates = selectedItems.map(bill => ({ student_id: studentData.user_id, month: bill.month, week_number: bill.week, status: 'pending', year: currentYear, amount: 5000 }));
      if (updates.length > 0) await (supabase.from('weekly_dues') as any).upsert(updates, { onConflict: 'student_id, month, week_number, year' });
      const expiresAt = new Date(Date.now() + 65 * 1000).toISOString();
      await (supabase as any).from('profiles').update({ payment_status: 'pending', payment_expires_at: expiresAt }).eq('id', studentData.id);
      const sessionData = { startTime: Date.now(), items: updates, amount: selectedTotal, studentData, nim };
      localStorage.setItem('payment_session', JSON.stringify(sessionData));
      setRawDues(prev => {
        const newDues = [...prev];
        updates.forEach(u => {
          const idx = newDues.findIndex(d => d.month === u.month && d.week_number === u.week_number);
          if (idx >= 0) newDues[idx] = { ...newDues[idx], status: 'pending' };
          else newDues.push(u);
        });
        return newDues;
      });

      setPendingVerifyItems(updates); setTimeLeft(60); setShowQRIS(true); setSelectedWeeks([]);
      toast.success("Tagihan dibuat! Silakan scan QR.");
      
      // Instant local sync for Admin Queue
      window.dispatchEvent(new Event('refresh-admin-queue'));
    } catch (error) { toast.error("Gagal memproses tagihan!"); } finally { setIsPaying(false); }
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

  return {
    state: {
      nim, isLoading, isPaying, isBelumBayar, studentData, unpaidWeeks, totalBill, showQRIS, rawDues, selectedWeeks, paymentAmount, profile, isMahasiswa, timeLeft, pendingVerifyItems, billingStart, billingEnd, activePeriod, selectedTotal: selectedWeeks.length * 5000
    },
    actions: {
      setNim, handleCheckBill, handleToggleWeek, handleCancelSingleItem, handlePayNow, getQRISImage, handleManualClose
    }
  };
}
