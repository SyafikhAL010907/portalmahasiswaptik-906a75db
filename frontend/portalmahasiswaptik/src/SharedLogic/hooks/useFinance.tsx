import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from "date-fns";
import { useAuth } from '@/contexts/AuthContext';
import { useBillingConfig } from '@/hooks/useBillingConfig';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { API_BASE_URL } from '@/lib/constants';

// --- INTERFACES ---
export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  transaction_date: string;
  category: string;
  class_id?: string;
  created_by?: string;
}

export interface FinanceSummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

export interface StudentPayment {
  name: string;
  student_id: string;
  payments: string[];
  lifetime_paid_count?: number;
  lifetime_total?: number;
  lifetime_deficiency?: string[];
  lifetime_deficiency_amount?: number;
}

export function useFinance() {
  const { session } = useAuth();
  const { last_selected_class, updatePreference } = useUserPreferences();

  // --- LOCAL NAVIGATION STATE ---
  const [localMonth, setLocalMonth] = useState<number>(0);
  const [selectedYear] = useState<number>(new Date().getFullYear());
  const [isLocalMonthInitialized, setIsLocalMonthInitialized] = useState(false);

  // --- DATA STATES ---
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [yearlyDues, setYearlyDues] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualSummary, setManualSummary] = useState<FinanceSummary>({ total_income: 0, total_expense: 0, balance: 0 });
  const [duesTotal, setDuesTotal] = useState<number>(0);
  const [classTransactionStats, setClassTransactionStats] = useState<FinanceSummary>({ total_income: 0, total_expense: 0, balance: 0 });
  const [userProfile, setUserProfile] = useState<{ role: string, class_id: string | null } | null>(null);

  // --- LOADING STATES ---
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  // --- UI CONTROL STATES ---
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [dummyTransactionFilter, setDummyTransactionFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [bottomTableMonth, setBottomTableMonth] = useState<number>(0);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [isEditTxOpen, setIsEditTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [displayAmount, setDisplayAmount] = useState('');
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense', description: '', amount: 0,
    transaction_date: new Date().toLocaleDateString('en-CA'),
    category: 'Umum'
  });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ studentId: string, studentName: string, weekIndex: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  // --- GLOBAL CONFIG (HOOK) ---
  const { billingStart, billingEnd, selectedMonth: defaultMonth, isLoadingConfig, updateBillingRange, isUpdatingConfig } = useBillingConfig();

  // 1. Initialize Classes and Initial Class Selection
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: cls } = await supabase.from('classes').select('id, name').order('name');
      if (cls && cls.length > 0) {
        setClasses(cls);
        if (user) {
          const { data: profile } = await (supabase.from('profiles').select('class_id, last_selected_class, role').eq('user_id', user.id).maybeSingle() as any);
          if (profile) {
            const p = profile as any;
            setUserProfile({ role: p.role, class_id: p.class_id });
            if (p.role === 'mahasiswa' && p.class_id) {
              setSelectedClassId(p.class_id);
            } else if (p.last_selected_class) {
              setSelectedClassId(p.last_selected_class);
            } else {
              const kelasA = cls.find(c => (c as any).name.toLowerCase().includes('kelas a') || (c as any).name === 'A');
              setSelectedClassId(kelasA ? (kelasA as any).id : (cls[0] as any).id);
            }
          }
        }
      }
    };
    initData();
  }, []);

  // 2. Sync Local Month with Global Default ONCE
  useEffect(() => {
    if (!isLoadingConfig && !isLocalMonthInitialized) {
      setLocalMonth(defaultMonth);
      setIsLocalMonthInitialized(true);
    }
  }, [isLoadingConfig, defaultMonth, isLocalMonthInitialized]);

  // 3. Data Fetchers
  const fetchTransactionStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      let query = (supabase.from('transactions') as any).select('*');
      if (localMonth === 0) {
        query = query.gte('transaction_date', `${selectedYear}-01-01`).lte('transaction_date', `${selectedYear}-12-31`);
      } else {
        const mStr = String(localMonth).padStart(2, '0');
        const lastDay = new Date(selectedYear, localMonth, 0).getDate();
        query = query.gte('transaction_date', `${selectedYear}-${mStr}-01`).lte('transaction_date', `${selectedYear}-${mStr}-${lastDay}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        setTransactions((data as any).sort((a: any, b: any) => new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()));
        const income = (data as any[]).filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const expense = (data as any[]).filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
        setManualSummary({ total_income: income, total_expense: expense, balance: income - expense });
      }
    } catch (err) { console.error(err); } finally { setIsLoadingStats(false); }
  }, [localMonth, selectedYear]);

  const fetchClassStats = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      let query = (supabase.from('transactions') as any).select('type, amount').eq('class_id', selectedClassId);
      if (localMonth === 0) {
        query = query.gte('transaction_date', `${selectedYear}-01-01`).lte('transaction_date', `${selectedYear}-12-31`);
      } else {
        const mStr = String(localMonth).padStart(2, '0');
        const lastDay = new Date(selectedYear, localMonth, 0).getDate();
        query = query.gte('transaction_date', `${selectedYear}-${mStr}-01`).lte('transaction_date', `${selectedYear}-${mStr}-${lastDay}`);
      }
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        const income = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        setClassTransactionStats({ total_income: income, total_expense: expense, balance: income - expense });
      }
    } catch (err) { console.error(err); setClassTransactionStats({ total_income: 0, total_expense: 0, balance: 0 }); }
  }, [selectedClassId, localMonth, selectedYear]);

  const fetchDuesTotal = useCallback(async () => {
    try {
      let query = (supabase.from('weekly_dues') as any).select('*', { count: 'exact', head: true }).eq('status', 'paid').eq('year', selectedYear);
      if (localMonth !== 0) query = query.eq('month', localMonth);
      const { count, error } = await query;
      if (!error) setDuesTotal((count || 0) * 5000);
    } catch (err) { console.error(err); }
  }, [localMonth, selectedYear]);

  const fetchStudentMatrix = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      setIsLoadingMatrix(true);
      const { data: profiles } = await (supabase.from('profiles') as any).select('user_id, full_name, role').eq('class_id', selectedClassId).in('role', ['mahasiswa', 'admin_kelas']).order('nim');
      if (!profiles || (profiles as any[]).length === 0) { setStudents([]); setYearlyDues([]); return; }
      setStudents(profiles as any[]);
      const { data: dues } = await (supabase.from('weekly_dues').select('*').in('student_id', (profiles as any[]).map(s => s.user_id)).eq('year', selectedYear) as any);
      setYearlyDues(dues || []);
    } catch (err) { console.error(err); } finally { setIsLoadingMatrix(false); }
  }, [selectedClassId, selectedYear]);

  // 4. Initial Trigger & Dependency Refresh
  useEffect(() => { fetchTransactionStats(); fetchDuesTotal(); }, [localMonth, selectedYear, fetchTransactionStats, fetchDuesTotal]);
  useEffect(() => { fetchClassStats(); fetchStudentMatrix(); }, [selectedClassId, localMonth, fetchClassStats, fetchStudentMatrix]);

  // --- 4.5 REAL-TIME SUBSCRIPTIONS (SYNC WITH SNIPPET) ---
  useEffect(() => {
    if (!session) return;
    const txChannel = supabase.channel('finance_tx_updates').on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
      fetchTransactionStats(); fetchClassStats(); fetchStudentMatrix();
      toast.success("Data transaksi disinkronkan secara real-time");
    }).subscribe();
    const duesChannel = supabase.channel(`finance_dues_${selectedClassId}`).on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_dues' }, () => {
      fetchStudentMatrix(); fetchDuesTotal();
      toast.success("Data iuran disinkronkan secara real-time");
    }).subscribe();
    return () => { supabase.removeChannel(txChannel); supabase.removeChannel(duesChannel); };
  }, [selectedClassId, session, fetchTransactionStats, fetchClassStats, fetchStudentMatrix, fetchDuesTotal]);

  // 5. Matrix Derived Data (1:1 Parity for Deficiency)
  const matrixData = useMemo(() => {
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
    return students.map(student => {
      const studentYearlyDues = yearlyDues.filter(d => d.student_id === student.user_id);
      if (localMonth !== 0) {
        const statuses = ["unpaid", "unpaid", "unpaid", "unpaid"];
        studentYearlyDues.filter(d => d.month === localMonth).forEach(d => { if (d.week_number <= 4) statuses[d.week_number - 1] = d.status; });
        return { name: student.full_name, student_id: student.user_id, payments: statuses };
      } else {
        let totalNominal = 0, fullMonths = 0, deficiencies: string[] = [], deficiencyAmount = 0;
        const monthlyGroups = new Map<number, { weeks: Set<number>, amount: number }>();
        studentYearlyDues.forEach(d => {
          if (!monthlyGroups.has(d.month)) monthlyGroups.set(d.month, { weeks: new Set(), amount: 0 });
          if (d.status === 'paid' || d.status === 'bebas') {
            const g = monthlyGroups.get(d.month)!; g.weeks.add(d.week_number);
            if (d.status === 'paid') g.amount += (d.amount || 0);
          }
        });
        const start = billingStart ?? 1, end = billingEnd ?? 6;
        for (let m = start; m <= end; m++) {
          const g = monthlyGroups.get(m);
          if (g) {
            totalNominal += g.amount;
            if (g.weeks.size >= 4 || g.amount >= 20000) fullMonths += 1;
            else {
              const missing = 4 - g.weeks.size;
              if (missing > 0) { deficiencies.push(`${monthNames[m]} ${missing} mg`); deficiencyAmount += (missing * 5000); }
            }
          } else {
            deficiencies.push(`${monthNames[m]} 4 mg`); deficiencyAmount += 20000;
          }
        }
        return { name: student.full_name, student_id: student.user_id, payments: [], lifetime_paid_count: fullMonths, lifetime_total: totalNominal, lifetime_deficiency: deficiencies, lifetime_deficiency_amount: deficiencyAmount };
      }
    });
  }, [students, yearlyDues, localMonth, billingStart, billingEnd]);

  // --- 5.5 ADVANCED ANALYTICS DERIVATIONS ---
  const totalIncomeTransactions = useMemo(() => {
    const incomeTxs = transactions.filter(tx => tx.type === 'income');
    if (localMonth === 0) return incomeTxs.filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear).reduce((sum, tx) => sum + tx.amount, 0);
    return incomeTxs.filter(tx => new Date(tx.transaction_date).getMonth() + 1 === localMonth && new Date(tx.transaction_date).getFullYear() === selectedYear).reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, localMonth, selectedYear]);

  const totalBatchExpenses = useMemo(() => {
    let filtered = transactions.filter(tx => tx.type === 'expense');
    if (localMonth === 0) filtered = filtered.filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear);
    else filtered = filtered.filter(tx => new Date(tx.transaction_date).getMonth() + 1 === localMonth && new Date(tx.transaction_date).getFullYear() === selectedYear);
    return filtered.reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, localMonth, selectedYear]);

  const batchNetBalance = useMemo(() => duesTotal + totalIncomeTransactions - totalBatchExpenses, [duesTotal, totalIncomeTransactions, totalBatchExpenses]);

  // Bottom Table Selection Logic (Lifetime)
  const processedBottomTransactions = useMemo(() => {
    const monthNames = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    let filtered = transactions.filter(tx => {
      if (dummyTransactionFilter !== 'all' && tx.type !== dummyTransactionFilter) return false;
      if (bottomTableMonth !== 0) {
        if (!tx.class_id) return false;
        const txMonth = new Date(tx.transaction_date).getMonth() + 1;
        if (txMonth !== bottomTableMonth) return false;
      }
      return new Date(tx.transaction_date).getFullYear() === selectedYear;
    });
    return filtered.map(tx => {
      const d = new Date(tx.transaction_date);
      const mIdx = d.getMonth() + 1;
      const cLabel = classes.find(c => c.id === tx.class_id)?.name || 'Angkatan';
      return { ...tx, monthLabel: monthNames[mIdx], classLabel: (cLabel === 'Angkatan' ? cLabel : `Kelas ${cLabel}`), sortMonth: mIdx, sortDate: d.getTime() };
    }).sort((a, b) => a.sortMonth - b.sortMonth || a.sortDate - b.sortDate);
  }, [transactions, dummyTransactionFilter, bottomTableMonth, selectedYear, classes]);

  const bottomTableStats = useMemo(() => {
    const income = processedBottomTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
    const expense = processedBottomTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
    return { income, expense, balance: income - expense };
  }, [processedBottomTransactions]);

  const classSpecificTotalIncome = useMemo(() => {
    let filtered = transactions.filter(tx => tx.type === 'income' && tx.class_id === selectedClassId);
    if (localMonth === 0) filtered = filtered.filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear);
    else filtered = filtered.filter(tx => new Date(tx.transaction_date).getMonth() + 1 === localMonth);
    return filtered.reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, selectedClassId, localMonth, selectedYear]);

  const classDuesTotal = useMemo(() => {
     if (localMonth === 0) return yearlyDues.filter(d => d.status === 'paid').reduce((sum, d) => sum + (d.amount || 0), 0);
     return yearlyDues.filter(d => d.month === localMonth && d.status === 'paid').reduce((sum, d) => sum + (d.amount || 0), 0);
  }, [yearlyDues, localMonth]);

  const totalPengeluaran = useMemo(() => {
    let filtered = transactions.filter(tx => tx.type === 'expense' && tx.class_id === selectedClassId);
    if (localMonth === 0) filtered = filtered.filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear);
    else filtered = filtered.filter(tx => new Date(tx.transaction_date).getMonth() + 1 === localMonth);
    return filtered.reduce((sum, tx) => sum + tx.amount, 0);
  }, [transactions, selectedClassId, localMonth, selectedYear]);

  const saldoBersih = (classDuesTotal + classSpecificTotalIncome) - totalPengeluaran;

  // 6. Action Handlers
  const handleClassChange = (newId: string) => { setSelectedClassId(newId); updatePreference({ last_selected_class: newId }); };
  const handleMonthChange = (m: number) => { setLocalMonth(m); };
  
  const handleUpdateStatus = async (status: string) => {
    if (!selectedCell || localMonth === 0) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('weekly_dues').upsert({
        student_id: selectedCell.studentId, week_number: selectedCell.weekIndex,
        status, amount: status === 'paid' ? 5000 : 0, month: localMonth, year: selectedYear
      }, { onConflict: 'student_id, week_number, month, year' });
      if (error) throw error;
      toast.success("Status diperbarui"); setIsDialogOpen(false); fetchStudentMatrix(); fetchDuesTotal();
    } catch (err: any) { toast.error(err.message); } finally { setIsUpdating(false); }
  };

  const handleEditClick = (tx: Transaction) => {
    setEditingTx(tx);
    setNewTx({ ...tx, transaction_date: tx.transaction_date.split('T')[0] });
    setDisplayAmount(new Intl.NumberFormat('id-ID').format(tx.amount));
    setIsEditTxOpen(true);
  };

  const handleSaveTransaction = async () => {
    const isEdit = isEditTxOpen;
    const targetTx = isEdit ? editingTx : newTx;
    if (!targetTx?.description || !targetTx?.amount) return toast.error("Lengkapi data!");
    
    setIsUpdating(true);
    try {
      const payload: any = { 
        ...targetTx, 
        created_by: session?.user.id, 
        class_id: targetTx.class_id || selectedClassId 
      };
      
      if (payload.class_id === 'all') {
        // Fallback to first class if 'all' is selected but schema requires a class
        payload.class_id = classes[0]?.id || null;
      }

      if (!payload.class_id) throw new Error("Pilih kelas terlebih dahulu!");
      if (!payload.transaction_date) {
        payload.transaction_date = format(new Date(), "yyyy-MM-dd");
      }

      const { error } = await supabase.from('transactions').upsert(payload);
      if (error) throw error;

      toast.success(isEdit ? "Transaksi diperbarui" : "Transaksi disimpan");
      setIsAddTxOpen(false);
      setIsEditTxOpen(false);
      fetchTransactionStats();
      fetchClassStats();
      fetchStudentMatrix();
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setIsUpdating(false); 
    }
  };

  const handleDeleteTransaction = (id: string) => {
    setTxToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', txToDelete);
      if (error) throw error;
      toast.success("Transaksi dihapus");
      setIsDeleteConfirmOpen(false);
      setTxToDelete(null);
      fetchTransactionStats();
      fetchClassStats();
    } catch (err: any) { 
      toast.error(err.message); 
    } finally { 
      setIsDeleting(false); 
    }
  };

  const handleBatchUpdateWeek = async (week: number, status: string) => {
    if (localMonth === 0 || !selectedClassId) return;
    setIsLoadingMatrix(true);
    try {
      const { data: profiles } = await (supabase.from('profiles') as any).select('user_id').eq('class_id', selectedClassId).in('role', ['mahasiswa', 'admin_kelas']);
      if (!profiles) return;
      const updates = profiles.map(p => ({
        student_id: (p as any).user_id, week_number: week, month: localMonth, year: selectedYear,
        status, amount: status === 'paid' ? 5000 : 0
      })) as any[];
      const { error } = await supabase.from('weekly_dues').upsert(updates, { onConflict: 'student_id, week_number, month, year' });
      if (error) throw error;
      toast.success(`Berhasil set ${status} untuk Minggu ${week}`);
      fetchStudentMatrix(); fetchDuesTotal();
    } catch (err: any) { toast.error(err.message); } finally { setIsLoadingMatrix(false); }
  };

  const handleBatchUpdateAllWeeks = async (status: string) => {
    if (localMonth === 0 || !selectedClassId) return;
    setIsLoadingMatrix(true);
    try {
      const { data: profiles } = await (supabase.from('profiles') as any).select('user_id').eq('class_id', selectedClassId).in('role', ['mahasiswa', 'admin_kelas']);
      if (!profiles) return;
      const updates: any[] = [];
      profiles.forEach(p => {
        [1, 2, 3, 4].forEach(w => {
          updates.push({
            student_id: p.user_id, week_number: w, month: localMonth, year: selectedYear,
            status, amount: status === 'paid' ? 5000 : 0
          });
        });
      });
      const { error } = await supabase.from('weekly_dues').upsert(updates, { onConflict: 'student_id, week_number, month, year' });
      if (error) throw error;
      toast.success(`Berhasil set ${status} untuk W1-W4`);
      fetchStudentMatrix(); fetchDuesTotal();
    } catch (err: any) { toast.error(err.message); } finally { setIsLoadingMatrix(false); }
  };

  const handleBulkUpdateStudent = async (studentId: string, status: string) => {
    if (localMonth === 0 || !userProfile || (userProfile.role !== 'admin_dev' && userProfile.role !== 'admin_kelas')) return;
    setIsLoadingMatrix(true);
    try {
      const updates = [1, 2, 3, 4].map(w => ({
        student_id: studentId, week_number: w, month: localMonth, year: selectedYear,
        status, amount: status === 'paid' ? 5000 : 0
      }));
      const { error } = await supabase.from('weekly_dues').upsert(updates, { onConflict: 'student_id, week_number, month, year' });
      if (error) throw error;
      toast.success("Update massal berhasil");
      fetchStudentMatrix(); fetchDuesTotal();
    } catch (err: any) { toast.error(err.message); } finally { setIsLoadingMatrix(false); }
  };

  const handleDownloadExcel = async () => {
    if (!session) return;
    try {
      toast.info("Sedang menyiapkan file Excel...");
      const response = await fetch(`${API_BASE_URL}/finance/export?class_id=${selectedClassId}&year=${selectedYear}&start_month=${billingStart}&end_month=${billingEnd}&token=${session.access_token}&action=download`, {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      if (!response.ok) throw new Error("Gagal download");
      const quotaRemaining = response.headers.get('X-Download-Remaining');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `Laporan_Keuangan_Kelas_${classes.find(c => c.id === selectedClassId)?.name || 'X'}_${selectedYear}.xlsx`;
      document.body.appendChild(a); a.click(); window.URL.revokeObjectURL(url);
      toast.success(
        <div className="flex flex-col gap-2">
          <span className="font-bold">Excel Berhasil! ✅</span>
          {quotaRemaining !== null && <span className="text-xs opacity-80">Jatah download sisa: {quotaRemaining} minggu ini.</span>}
        </div>
      );
    } catch (err: any) { toast.error(err.message); }
  };

  const handlePreviewExcel = async () => {
    if (!session) return;
    try {
      toast.info("Menyiapkan pratinjau Excel...");
      const exportUrl = `${API_BASE_URL}/finance/export?class_id=${selectedClassId}&year=${selectedYear}&start_month=${billingStart}&end_month=${billingEnd}&token=${session.access_token}`;
      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error("Gagal mengambil data");
      const blob = await response.blob();
      const fileName = `temp_preview_${Date.now()}.xlsx`, filePath = `temp/${fileName}`;
      const { error: uploadError } = await supabase.storage.from("avatars").upload(filePath, blob, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(filePath);
      const gviewUrl = `https://docs.google.com/gview?url=${encodeURIComponent(publicUrl)}&embedded=true`;
      window.open(gviewUrl, '_blank');
      toast.success("Pratinjau siap!");
      setTimeout(() => { supabase.storage.from("avatars").remove([filePath]); }, 60000);
    } catch (err: any) { toast.error("Gagal pratinjau: " + err.message); }
  };

  return {
    state: {
      classes, selectedClassId, yearlyDues, students, transactions, manualSummary, duesTotal, classTransactionStats,
      isLoadingMatrix, isLoadingStats, transactionFilter, dummyTransactionFilter, bottomTableMonth,
      isAddTxOpen, isEditTxOpen, editingTx, displayAmount, newTx, isDialogOpen, selectedCell, isUpdating, isDeleting,
      isDeleteConfirmOpen, txToDelete,
      billingStart, billingEnd, localMonth, selectedYear, matrixData, isLoadingConfig, isUpdatingConfig, userProfile,
      batchNetBalance, totalIncomeTransactions, totalBatchExpenses, processedBottomTransactions, bottomTableStats,
      classSpecificTotalIncome, classDuesTotal, saldoBersih
    },
    actions: {
      setSelectedClassId: handleClassChange, setLocalMonth: handleMonthChange, setTransactionFilter, setDummyTransactionFilter, setBottomTableMonth,
      setIsAddTxOpen, setIsEditTxOpen, setEditingTx, setDisplayAmount, setNewTx, setIsDialogOpen, setSelectedCell,
      handleUpdateStatus, handleSaveTransaction, handleDeleteTransaction, confirmDeleteTransaction, setIsDeleteConfirmOpen, updateBillingRange,
      handleEditClick, fetchStudentMatrix, fetchTransactionStats, fetchClassStats, fetchDuesTotal,
      handleBatchUpdateWeek, handleBatchUpdateAllWeeks, handleBulkUpdateStudent, handleDownloadExcel, handlePreviewExcel
    }
  };
}
