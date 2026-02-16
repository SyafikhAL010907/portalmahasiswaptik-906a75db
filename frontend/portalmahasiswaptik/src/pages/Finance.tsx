import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Check, Clock, X, Loader2, AlertCircle, Download, Gift, Pencil, Trash2, Plus, Save, ArrowRight, Folder, ChevronDown, MoreVertical, Unlock, Zap, Calendar } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import GlassConfirmationModal from '@/components/ui/GlassConfirmationModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn, formatIDR } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { DatePicker } from '@/components/ui/date-picker';
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Added DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/contexts/AuthContext';
// ✅ PENTING: XLSX ditiadakan di frontend untuk kestabilan (Error Stream)
// import XLSX from 'xlsx-js-style'; 
import { FinancialChart } from '@/components/dashboard/FinancialChart'; // Added FinancialChart
import { useBillingConfig } from '@/hooks/useBillingConfig';

// --- INTERFACES ---
interface StudentPayment {
  name: string;
  student_id: string;
  payments: string[];
  lifetime_paid_count?: number;
  lifetime_total?: number;
  lifetime_deficiency?: string[];
  lifetime_deficiency_amount?: number; // New field
}

interface ClassData {
  id: string;
  name: string;
}

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  transaction_date: string;
  category: string;
  class_id?: string; // Optional - null for batch-wide transactions
  created_by?: string; // Added created_by
}

interface FinanceSummary {
  total_income: number;
  total_expense: number;
  balance: number;
}

interface UserProfile {
  user_id: string;
  role: string;
  class_id: string | null;
}

export default function Finance() {
  const { session } = useAuth();

  // --- STATE ---
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [yearlyDues, setYearlyDues] = useState<any[]>([]);
  const [students, setStudents] = useState<{ user_id: string, full_name: string }[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualSummary, setManualSummary] = useState<FinanceSummary>({ total_income: 0, total_expense: 0, balance: 0 });
  const [duesTotal, setDuesTotal] = useState<number>(0);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ studentId: string, studentName: string, weekIndex: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [weeks] = useState(['W1', 'W2', 'W3', 'W4']);
  const [classTransactionStats, setClassTransactionStats] = useState<FinanceSummary>({ total_income: 0, total_expense: 0, balance: 0 });

  const [isAddTxOpen, setIsAddTxOpen] = useState(false);

  // BILLING RANGE STATE (Global Config) - Unified Source of Truth
  const {
    billingStart,
    billingEnd,
    selectedMonth,
    isUpdatingConfig,
    isLoadingConfig,
    updateBillingRange
  } = useBillingConfig();

  // GLASS CONFIRMATION STATE
  const [isGlassConfirmOpen, setIsGlassConfirmOpen] = useState(false);
  const [glassConfirmConfig, setGlassConfirmConfig] = useState({
    title: '',
    message: '',
    onConfirm: () => { }
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayAmount, setDisplayAmount] = useState('');
  const [selectedTransactionMonth, setSelectedTransactionMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedTransactionYear] = useState<number>(new Date().getFullYear());
  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    description: '',
    amount: 0,
    transaction_date: new Date().toLocaleDateString('en-CA'),
    category: 'Umum',
    class_id: undefined
  });

  // Edit Transaction State
  const [isEditTxOpen, setIsEditTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // --- CONFIRMATION MODAL STATE ---
  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    variant: 'danger' | 'warning' | 'info';
    confirmText?: string;
    onConfirm: () => Promise<void> | void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    variant: 'danger',
    onConfirm: () => { },
  });

  const closeModal = () => setModalConfig(prev => ({ ...prev, isOpen: false }));

  const openConfirmation = (
    title: string,
    description: string,
    onConfirm: () => Promise<void> | void,
    variant: 'danger' | 'warning' | 'info' = 'danger',
    confirmText: string = 'Konfirmasi'
  ) => {
    setModalConfig({
      isOpen: true,
      title,
      description,
      variant,
      confirmText,
      onConfirm: async () => {
        await onConfirm();
        closeModal();
      }
    });
  };

  // Default to CURRENT YEAR. (selectedMonth is now Global)
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all'); // ADDED FILTER STATE

  // V7.1: Universal Billing Trigger States (REMOVED - MOVED TO GLOBAL CONFIG ABOVE)

  const months = [
    { value: 0, label: 'Lifetime' },
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ];

  const transactionMonths = [
    { value: 1, label: 'Januari' }, { value: 2, label: 'Februari' }, { value: 3, label: 'Maret' },
    { value: 4, label: 'April' }, { value: 5, label: 'Mei' }, { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' }, { value: 8, label: 'Agustus' }, { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' }, { value: 11, label: 'November' }, { value: 12, label: 'Desember' }
  ];

  const isLifetime = selectedMonth === 0;

  // 1. INIT DATA
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('class_id').eq('user_id', user.id).maybeSingle();
        const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).maybeSingle();
        if (profile && roleData) {
          setCurrentUser({ user_id: user.id, class_id: profile.class_id, role: roleData.role });
        }
      }
      const { data: cls } = await supabase.from('classes').select('id, name').order('name');
      if (cls && cls.length > 0) {
        setClasses(cls);
        setSelectedClassId(cls[0].id);
      }
    };
    initData();
  }, []);

  // 2. FETCH STATS (Transactions) - Server-Side Filtering
  const fetchTransactionStats = useCallback(async () => {
    try {
      setIsLoadingStats(true);
      let query = supabase.from('transactions').select('*');

      // ✅ RE-IMPLEMENTED: JANGAN FILTER CLASSID DI QUERY (Agar kita punya data global untuk Hero Card)
      if (isLifetime) {
        const startYear = `${selectedYear}-01-01`;
        const endYear = `${selectedYear}-12-31`;
        query = query.gte('transaction_date', startYear).lte('transaction_date', endYear);
      } else {
        const mStr = String(selectedMonth).padStart(2, '0');
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        const startMonth = `${selectedYear}-${mStr}-01`;
        const endMonth = `${selectedYear}-${mStr}-${lastDay}`;
        query = query.gte('transaction_date', startMonth).lte('transaction_date', endMonth);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const income = data.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
        const expense = data.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);

        setManualSummary({
          total_income: income,
          total_expense: expense,
          balance: income - expense
        });

        setTransactions((data as any).sort((a: any, b: any) =>
          new Date(b.transaction_date).getTime() - new Date(a.transaction_date).getTime()
        ));
      }
    } catch (error) {
      console.error("Gagal ambil stats transaksi:", error);
      toast.error("Gagal sinkronisasi data transaksi");
    } finally {
      setIsLoadingStats(false);
    }
  }, [isLifetime, selectedMonth, selectedYear, selectedClassId]);

  const fetchClassStats = useCallback(async () => {
    if (!selectedClassId || !session) return;
    try {
      setIsLoadingStats(true);

      // ✅ FIX 404: Direct Supabase query instead of backend endpoint
      let query = supabase.from('transactions')
        .select('type, amount')
        .eq('class_id', selectedClassId);

      if (isLifetime) {
        query = query.gte('transaction_date', `${selectedYear}-01-01`).lte('transaction_date', `${selectedYear}-12-31`);
      } else {
        const mStr = String(selectedMonth).padStart(2, '0');
        const lastDay = new Date(selectedYear, selectedMonth, 0).getDate();
        query = query.gte('transaction_date', `${selectedYear}-${mStr}-01`).lte('transaction_date', `${selectedYear}-${mStr}-${lastDay}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data) {
        const income = data.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const expense = data.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        setClassTransactionStats({
          total_income: income,
          total_expense: expense,
          balance: income - expense
        });
      }
    } catch (error: any) {
      console.error("Gagal fetch class stats:", error);
      // Fallback to avoid white screen
      setClassTransactionStats({ total_income: 0, total_expense: 0, balance: 0 });
    } finally {
      setIsLoadingStats(false);
    }
  }, [selectedClassId, isLifetime, selectedMonth, selectedYear, session]);

  const fetchDuesTotal = useCallback(async () => {
    try {
      let query: any = supabase.from('weekly_dues').select('*', { count: 'exact', head: true }).eq('status', 'paid').eq('year', selectedYear);
      if (!isLifetime) {
        query = query.eq('month', selectedMonth);
      }
      const { count, error } = await query;
      if (!error) setDuesTotal((count || 0) * 5000);
    } catch (err) { console.error(err); }
  }, [isLifetime, selectedMonth, selectedYear]);

  const fetchStudentMatrix = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      setIsLoadingMatrix(true);
      setFetchError(null);

      const { data: validRoles, error: roleError } = await supabase.from('user_roles').select('user_id').in('role', ['mahasiswa', 'admin_kelas'] as any);
      if (roleError) throw roleError;
      if (!validRoles || validRoles.length === 0) { setStudents([]); setYearlyDues([]); return; }
      const validUserIds = validRoles.map(r => r.user_id);

      const { data: profileData, error: profilesError } = await supabase.from('profiles').select('user_id, full_name').eq('class_id', selectedClassId).in('user_id', validUserIds).order('nim');
      if (profilesError) throw profilesError;
      if (!profileData || profileData.length === 0) { setStudents([]); setYearlyDues([]); return; }
      setStudents(profileData);

      // FETCH ALL DUES FOR THE YEAR AT ONCE ⚡
      const { data: dues, error: duesError } = await supabase.from('weekly_dues').select('*').in('student_id', profileData.map(s => s.user_id)).eq('year', selectedYear);
      if (duesError) throw duesError;
      setYearlyDues(dues || []);

    } catch (error: any) {
      console.error("Matrix error:", error);
      setFetchError(error.message || "Gagal memuat data matrix");
      toast.error(error.message || "Gagal memuat data matrix");
    } finally {
      setIsLoadingMatrix(false);
    }
  }, [selectedClassId, selectedYear]);

  // Derived Matrix Data (The Mirror Source) 💎
  const matrixData = useMemo(() => {
    const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];

    return students.map(student => {
      const studentYearlyDues = yearlyDues.filter(d => d.student_id === student.user_id);

      if (!isLifetime) {
        // Monthly View
        const statusList = ["unpaid", "unpaid", "unpaid", "unpaid"];
        studentYearlyDues.filter(d => d.month === selectedMonth).forEach(due => {
          if (due.week_number <= 4) statusList[due.week_number - 1] = due.status;
        });
        return { name: student.full_name, student_id: student.user_id, payments: statusList };
      } else {
        // Lifetime View
        let totalNominal = 0;
        let fullMonths = 0;
        let deficiencies: string[] = [];
        let deficiencyAmount = 0;

        // Group by month for lifetime stats
        const monthlyGroups = new Map<number, { weeks: Set<number>, amount: number }>();
        studentYearlyDues.forEach(d => {
          // Fix V6.1: Always initialize group if data exists, regardless of status.
          // This ensures "Future Unpaid" detects as "Data Exists" instead of "Missing Data".
          if (!monthlyGroups.has(d.month)) monthlyGroups.set(d.month, { weeks: new Set(), amount: 0 });

          if (d.status === 'paid' || d.status === 'bebas') {
            const group = monthlyGroups.get(d.month)!;
            group.weeks.add(d.week_number);
            if (d.status === 'paid') group.amount += d.amount; // Only add amount if paid
          }
        });

        // NOW CALCULATE DEFICIENCY based on Auto-Pilot (V7.1 Universal Trigger)
        // Loop restricted to chosen Billing Range
        // NOW CALCULATE DEFICIENCY based on Auto-Pilot (V7.1 Universal Trigger)
        // Loop restricted to chosen Billing Range
        const startMonth = billingStart ?? 1; // Fallback only for calculation safety if null (should be handled by UI)
        const endMonth = billingEnd ?? 6;

        // If config is not loaded yet, skip strict deficiency calc or use defaults? 
        // User wants strict sync. If null, we shouldn't calculate "deficiency" strictly yet. 
        // But for safety, we used 1 and 6 above, but let's actually just return early or use defaults if null.
        // Given UI will block, defaults here are fine as temporary.
        // Current month check for "Future" logic is relative to Real Time?
        // User said: "Di dalam rentang tersebut... OTOMATIS hitung sebagai hutang".
        // "Jika di luar rentang... abaikan".
        // Use Strict Rule within Range.

        for (let m = startMonth; m <= endMonth; m++) {
          const group = monthlyGroups.get(m);

          if (group) {
            totalNominal += group.amount;
            // Case 1: Data Exists
            if (group.weeks.size >= 4 || group.amount >= 20000) {
              fullMonths += 1;
            } else {
              const missing = 4 - group.weeks.size;
              const debt = missing * 5000;
              if (debt > 0) {
                // V7.1 Format: "Jan 4 mg" (Positive Integer)
                deficiencies.push(`${monthNames[m]} ${missing} mg`);
                deficiencyAmount += debt;
              }
            }
          } else {
            // Case 2: Data Missing
            // STRICT RULE: If inside billing range, it IS a debt.
            const missing = 4;
            const debt = 20000;
            deficiencies.push(`${monthNames[m]} ${missing} mg`);
            deficiencyAmount += debt;
          }
        }

        return {
          name: student.full_name,
          student_id: student.user_id,
          payments: [],
          lifetime_paid_count: fullMonths,
          lifetime_total: totalNominal,
          lifetime_deficiency: deficiencies,
          lifetime_deficiency_amount: deficiencyAmount
        };
      }
    });
  }, [students, yearlyDues, isLifetime, selectedMonth, billingStart, billingEnd]);

  // ✅ RE-IMPLEMENTED: FETCH GLOBAL DATA (Month/Year/Lifetime) - Independent of selectedClassId
  useEffect(() => {
    if (session) {
      fetchTransactionStats();
      fetchDuesTotal();
    }
  }, [selectedMonth, selectedYear, isLifetime, session, fetchTransactionStats, fetchDuesTotal]);

  // ✅ RE-IMPLEMENTED: FETCH CLASS-SPECIFIC DATA (Matrix & Class Stats)
  useEffect(() => {
    if (session && selectedClassId) {
      fetchClassStats();
      fetchStudentMatrix();
    }
  }, [selectedClassId, session, fetchClassStats, fetchStudentMatrix]);

  // REAL-TIME SUBSCRIPTIONS for Finance Updates ⚡
  useEffect(() => {
    if (!session) return;

    // Subscribe to transactions table (GLOBAL for the selected period)
    const txChannel = supabase
      .channel('finance_global_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
        },
        (payload) => {
          console.log('💰 Finance transaction update:', payload);

          // Re-fetch all finance data
          fetchTransactionStats();
          fetchClassStats();
          fetchStudentMatrix();

          toast.success("Data keuangan telah disinkronkan", {
            description: "💰 Transaksi diperbarui secara real-time",
            duration: 2000,
          });
        }
      )
      .subscribe();

    // Subscribe to weekly_dues
    const duesChannel = supabase
      .channel(`finance_dues_${selectedClassId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'weekly_dues'
        },
        (payload) => {
          console.log('💸 Finance dues update:', payload);

          // Re-fetch student matrix and dues total
          fetchStudentMatrix();
          fetchDuesTotal();

          toast.success("Matrix iuran telah disinkronkan", {
            description: "💸 Status pembayaran diupdate secara real-time",
            duration: 2000,
          });
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      supabase.removeChannel(txChannel);
      supabase.removeChannel(duesChannel);
    };
  }, [selectedClassId, session]);

  // --- EVENT HANDLERS (ANTI-GHOSTING WRAPPERS) ---
  const handleClassChange = (newClassId: string) => {
    if (newClassId === selectedClassId) return;
    setIsLoadingStats(true);
    setIsLoadingMatrix(true);
    setTransactions([]);
    setYearlyDues([]); // Clear the source instead
    setManualSummary({ total_income: 0, total_expense: 0, balance: 0 });
    setDuesTotal(0);
    setSelectedClassId(newClassId);
  };

  const handleMonthChange = (newMonth: number) => {
    if (newMonth === selectedMonth) return;

    // UI Feedback
    setIsLoadingStats(true);
    setIsLoadingMatrix(true);
    setTransactions([]);
    setYearlyDues([]);
    setManualSummary({ total_income: 0, total_expense: 0, balance: 0 });
    setDuesTotal(0);

    // Update Global Sync (Hook handles UI Update)
    if (currentUser?.role === 'admin_dev' || currentUser?.role === 'admin_kelas') {
      updateBillingRange(billingStart || 1, billingEnd || 6, newMonth);
    } else {
      // For students, this will just snap back if session doesn't allow saving
      // to GlobalConfig, but as per user request, we use ONLY the global source.
      toast.info("Filter sinkron dengan panel Admin.");
    }
  };

  const toggleLifetime = () => {
    setIsLoadingStats(true);
    setIsLoadingMatrix(true);
    setTransactions([]);
    setYearlyDues([]);
    setManualSummary({ total_income: 0, total_expense: 0, balance: 0 });
    setDuesTotal(0);

    const nextMonth = selectedMonth === 0 ? (new Date().getMonth() + 1) : 0;

    // Update Global Sync
    if (currentUser?.role === 'admin_dev' || currentUser?.role === 'admin_kelas') {
      updateBillingRange(billingStart || 1, billingEnd || 6, nextMonth);
    } else {
      toast.info("Tampilan sinkron dengan panel Admin.");
    }
  };


  // formatRupiah removed and replaced by formatIDR from utils.ts

  const classDuesTotal = useMemo(() => {
    if (isLifetime) {
      return matrixData.reduce((sum, s) => sum + (s.lifetime_total || 0), 0);
    }
    let countPaid = 0;
    matrixData.forEach(student => {
      countPaid += student.payments.filter(p => p === 'paid').length;
    });
    return countPaid * 5000;
  }, [matrixData, isLifetime]);

  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || '...';

  const totalKasAngkatan = useMemo(() => {
    return duesTotal;
  }, [duesTotal]);


  const totalIncomeTransactions = useMemo(() => {
    // ✅ GLOBAL: Hitung SEMUA transaksi bertipe income (Hibah, Donasi, dll)
    const incomeTxs = transactions.filter(tx => tx.type === 'income');

    if (isLifetime) {
      return incomeTxs
        .filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear)
        .reduce((sum, tx) => sum + tx.amount, 0);
    }

    return incomeTxs.filter(tx =>
      new Date(tx.transaction_date).getMonth() + 1 === selectedMonth &&
      new Date(tx.transaction_date).getFullYear() === selectedYear
    ).reduce((sum, tx) => sum + tx.amount, 0);
  }, [isLifetime, transactions, selectedMonth, selectedYear]);

  const classSpecificTotalIncome = useMemo(() => {
    // ✅ LOCAL: Validasi Pemasukan Kelas Spesifik (Strict Class ID)
    let filtered = transactions.filter(tx =>
      tx.type === 'income' &&
      tx.class_id === selectedClassId
    );
    if (isLifetime) {
      filtered = filtered.filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear);
    } else {
      filtered = filtered.filter(tx =>
        new Date(tx.transaction_date).getMonth() + 1 === selectedMonth &&
        new Date(tx.transaction_date).getFullYear() === selectedYear
      );
    }
    return filtered.reduce((sum, tx) => sum + tx.amount, 0);
  }, [isLifetime, transactions, selectedClassId, selectedMonth, selectedYear]);

  const totalPemasukan = useMemo(() => classDuesTotal + classSpecificTotalIncome, [classDuesTotal, classSpecificTotalIncome]);

  const totalBatchExpenses = useMemo(() => {
    // ✅ GLOBAL: Pengeluaran seluruh angkatan
    let filtered = transactions.filter(tx => tx.type === 'expense');
    if (isLifetime) {
      filtered = filtered.filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear);
    } else {
      filtered = filtered.filter(tx =>
        new Date(tx.transaction_date).getMonth() + 1 === selectedMonth &&
        new Date(tx.transaction_date).getFullYear() === selectedYear
      );
    }
    return filtered.reduce((sum, tx) => sum + tx.amount, 0);
  }, [isLifetime, transactions, selectedMonth, selectedYear]);

  const batchNetBalance = useMemo(() => {
    // ✅ SINGLE SOURCE: Total Iuran (Global) + Total Income Transaksi (Global) - Total Pengeluaran (Global)
    return totalKasAngkatan + totalIncomeTransactions - totalBatchExpenses;
  }, [totalKasAngkatan, totalIncomeTransactions, totalBatchExpenses]);

  const totalPengeluaran = useMemo(() => {
    let filtered = transactions.filter(tx => tx.type === 'expense' && tx.class_id === selectedClassId);
    if (isLifetime) {
      filtered = filtered.filter(tx => new Date(tx.transaction_date).getFullYear() === selectedYear);
    } else {
      filtered = filtered.filter(tx =>
        new Date(tx.transaction_date).getMonth() + 1 === selectedMonth &&
        new Date(tx.transaction_date).getFullYear() === selectedYear
      );
    }
    return filtered.reduce((sum, tx) => sum + tx.amount, 0);
  }, [isLifetime, transactions, selectedClassId, selectedMonth, selectedYear]);

  const saldoBersih = totalPemasukan - totalPengeluaran;

  const canEdit = () => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin_dev') return true;

    // admin_kelas restrictions:
    if (currentUser.role === 'admin_kelas') {
      // Lifetime mode: NO access (angkatan-wide data, admin_dev only)
      if (isLifetime) return false;

      // STRICT MODE: Only allow if assigned class matches selected tab
      return currentUser.class_id === selectedClassId;
    }

    return false;
  };

  const handleCellClick = (studentId: string, studentName: string, weekIdx: number) => {
    if (!canEdit()) { toast.error("Anda tidak memiliki akses."); return; }
    if (isLifetime) { toast.error("Silakan pilih bulan spesifik."); return; }
    setSelectedCell({ studentId, studentName, weekIndex: weekIdx + 1 });
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedCell || selectedMonth === 0) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('weekly_dues').upsert({
        student_id: selectedCell.studentId,
        week_number: selectedCell.weekIndex,
        status: newStatus,
        amount: 5000,
        month: selectedMonth,
        year: selectedYear
      }, { onConflict: 'student_id, week_number, month, year' });
      if (error) throw error;

      // Update yearlyDues (Source) and matrixData will re-memoize 💎
      setYearlyDues(prev => {
        const others = prev.filter(d =>
          !(d.student_id === selectedCell.studentId &&
            d.week_number === selectedCell.weekIndex &&
            d.month === selectedMonth &&
            d.year === selectedYear)
        );
        return [...others, {
          student_id: selectedCell.studentId,
          week_number: selectedCell.weekIndex,
          status: newStatus,
          amount: 5000,
          month: selectedMonth,
          year: selectedYear
        }];
      });

      fetchDuesTotal();
      toast.success(`Berhasil update jadi ${newStatus}`);
      setIsDialogOpen(false);
    } catch (error: any) { toast.error("Gagal: " + error.message); } finally { setIsUpdating(false); }
  };

  const handleBulkUpdate = async (studentId: string, studentName: string, targetStatus: 'paid' | 'pending' | 'reset') => {
    // STRICT CHECK: Only admin_dev can bulk update
    if (currentUser?.role !== 'admin_dev') {
      toast.error("Hanya Admin Developer yang bisa melakukan update massal.");
      return;
    }
    if (selectedMonth === 0) {
      toast.error("Pilih bulan spesifik dulu untuk update massal.");
      return;
    }

    const statusLabel = targetStatus === 'paid' ? 'Lunas' : targetStatus === 'pending' ? 'Pending' : 'Belum Bayar';
    const monthName = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][selectedMonth];

    openConfirmation(
      `Set Massal ${statusLabel}?`,
      `Apakah Anda yakin ingin mengubah status iuran ${studentName} di bulan ${monthName} menjadi ${statusLabel} secara massal untuk 4 minggu sekaligus?`,
      async () => {
        setIsUpdating(true);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) throw new Error("Sesi tidak ditemukan");

          const response = await fetch('/api/finance/dues/bulk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              student_id: studentId,
              month: selectedMonth,
              year: selectedYear,
              target_status: targetStatus
            })
          });

          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "Gagal update massal");

          toast.success(`Berhasil! Status ${studentName} di ${monthName} sekarang ${statusLabel}.`);
          fetchStudentMatrix(); // Refresh matrix
          fetchDuesTotal();
        } catch (error: any) {
          toast.error("Gagal update massal: " + error.message);
        } finally {
          setIsUpdating(false);
        }
      },
      targetStatus === 'reset' ? 'danger' : 'info',
      'Konfirmasi'
    );
  };
  const handleAmountChange = (val: string, isEdit = false) => {
    const cleanNumber = val.replace(/\D/g, "");
    const numericValue = Number(cleanNumber);

    // UI Polish: Real-time formatting using formatIDR (no currency symbol for input)
    const formatted = cleanNumber ? new Intl.NumberFormat('id-ID').format(numericValue) : '';

    if (isEdit && editingTx) {
      setEditingTx({ ...editingTx, amount: numericValue });
    } else {
      setDisplayAmount(formatted);
      setNewTx(prev => ({ ...prev, amount: numericValue }));
    }
    return formatted;
  };

  const handleAddTransaction = async () => {
    if (!newTx.description || !newTx.amount || !newTx.type || !currentUser) { toast.error("Lengkapi data"); return; }
    setIsSubmitting(true);
    try {
      const targetClassId = isLifetime ? newTx.class_id : selectedClassId;
      const targetMonth = isLifetime ? selectedTransactionMonth : selectedMonth;
      const targetYear = isLifetime ? selectedTransactionYear : selectedYear;
      const payload: any = {
        type: newTx.type,
        description: newTx.description,
        amount: newTx.amount,
        transaction_date: targetClassId ? `${targetYear}-${String(targetMonth).padStart(2, '0')}-01` : new Date().toLocaleDateString('en-CA'),
        category: isLifetime ? 'General' : (newTx.type === 'income' ? 'hibah' : newTx.category),
        created_by: currentUser.user_id
      };
      if (targetClassId) payload.class_id = targetClassId;
      const { error } = await supabase.from('transactions').insert([payload]);
      if (error) throw error;
      toast.success("Transaksi ditambahkan");
      setIsAddTxOpen(false);
      setNewTx({ type: 'expense', description: '', amount: 0, transaction_date: new Date().toLocaleDateString('en-CA'), category: 'Umum', class_id: undefined });
      setDisplayAmount('');
      fetchTransactionStats(); fetchClassStats(); fetchDuesTotal();
    } catch (error: any) { toast.error(error.message); } finally { setIsSubmitting(false); }
  };

  const handleDeleteTransaction = async (id: string) => {
    // STRICT CHECK: Only admin_dev can delete transactions
    if (currentUser?.role !== 'admin_dev') {
      toast.error("Hanya Admin Developer yang bisa menghapus transaksi.");
      return;
    }

    openConfirmation(
      'Hapus Transaksi?',
      "Apakah Anda yakin ingin menghapus transaksi ini?",
      async () => {
        setIsDeleting(true);
        try {
          const { error } = await supabase.from('transactions').delete().eq('id', id);
          if (error) throw error;
          toast.success("Dihapus"); fetchTransactionStats(); fetchClassStats();
        } catch (err: any) { toast.error(err.message); } finally { setIsDeleting(false); }
      }
    );
  };

  const handleEditClick = (tx: Transaction) => {
    console.log('DEBUG_EDIT_DATA:', tx);
    if (canEdit()) {
      // --- SANITASI DATA ANTI-CRASH ---
      const safeAmount = Number(tx.amount);

      const sanitizedTx: Transaction = {
        ...tx,
        // Pastikan Amount jadi angka 0 kalau dia NaN atau Null
        amount: isNaN(safeAmount) ? 0 : safeAmount,
        // Pastikan string tidak null
        description: tx.description || '',
        // Pastikan kategori ada isinya
        category: tx.category || 'Lainnya',
        // Pastikan tanggal aman
        transaction_date: tx.transaction_date || new Date().toISOString().slice(0, 10),
        type: tx.type || 'expense',
        // Jaga-jaga class_id (biarkan undefined kalau tidak ada)
        class_id: tx.class_id || undefined
      };

      console.log('DEBUG_SANITIZED_DATA:', sanitizedTx);
      setEditingTx(sanitizedTx);
      setIsEditTxOpen(true);
    }
  };

  const handleUpdateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('transactions').update({ amount: editingTx.amount, description: editingTx.description, category: editingTx.category, transaction_date: editingTx.transaction_date, type: editingTx.type, class_id: editingTx.class_id }).eq('id', editingTx.id);
      if (error) throw error;
      toast.success("Berhasil diupdate"); setIsEditTxOpen(false); fetchTransactionStats(); fetchClassStats();
    } catch (err: any) { toast.error(err.message); } finally { setIsUpdating(false); }
  };

  const handleDownloadExcel = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Sesi tidak ditemukan. Silakan login kembali.");
        return;
      }

      toast.info("Sedang menyiapkan file Excel...");

      // V8.2: Forced Dynamic URL (LAN/WiFi Friendly)
      const baseUrl = import.meta.env.VITE_API_URL;
      const exportUrl = `${baseUrl}/finance/export?class_id=${selectedClassId}&year=${selectedYear}&start_month=${billingStart}&end_month=${billingEnd}`;

      console.log("Export URL (Dynamic + Auth):", exportUrl);

      // USE FETCH WITH AUTH HEADER
      const response = await fetch(exportUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server Error: ${response.status} - ${errorText}`);
      }

      // HANDLE BLOB DOWNLOAD
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.setAttribute('download', `Laporan_Keuangan_${selectedClassName || 'Angkatan'}_${selectedYear}.xlsx`);
      document.body.appendChild(link);
      link.click();

      // CLEANUP
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
      toast.success("Excel berhasil didownload!");

    } catch (error: any) {
      console.error("Download failed:", error);
      toast.error("Gagal mendownload Excel: " + error.message);
    }
  };

  const handleBatchUpdateWeek = async (week: number, status: 'paid' | 'bebas' = 'bebas') => {
    const actionLabel = status === 'paid' ? 'LUNAS' : 'BEBAS KAS';

    setGlassConfirmConfig({
      title: `Konfirmasi Set ${actionLabel}`,
      message: `Yakin ingin mengubah status SEMUA mahasiswa di kelas ini menjadi ${actionLabel} untuk Minggu ke-${week}? Tindakan ini tidak dapat dibatalkan dengan mudah.`,
      onConfirm: async () => {
        setIsLoadingMatrix(true);
        try {
          // Loop update for all displayed students
          const updates = matrixData.map(async (student) => {
            const { error } = await supabase.from('weekly_dues').upsert({
              student_id: student.student_id,
              week_number: week,
              month: selectedMonth,
              year: selectedYear,
              amount: status === 'paid' ? 5000 : 0, // Paid = 5000, Bebas = 0
              status: status
            }, { onConflict: 'student_id, week_number, month, year' }); // Upsert by unique constraint
            if (error) console.error(`Failed to update ${student.name}:`, error);
          });
          await Promise.all(updates);
          toast.success(`Berhasil set ${actionLabel} Minggu ${week} untuk kelas ini!`);
          fetchStudentMatrix(); // Refresh
          fetchDuesTotal(); // Refresh totals if paid
        } catch (err) {
          toast.error("Gagal melakukan batch update.");
        } finally {
          setIsLoadingMatrix(false);
        }
      }
    });
    setIsGlassConfirmOpen(true);
  };

  const handleBatchUpdateAllWeeks = async (status: 'paid' | 'bebas' = 'bebas') => {
    const actionLabel = status === 'paid' ? 'LUNAS' : 'BEBAS KAS';
    if (!confirm(`Yakin ingin mengubah status SEMUA mahasiswa di kelas ini menjadi ${actionLabel} untuk SEMUA MINGGU (W1-W4)?`)) return;
    setIsLoadingMatrix(true);
    try {
      // Loop update for all displayed students AND all weeks
      const updates = [];
      const weeks = [1, 2, 3, 4];

      for (const student of matrixData) {
        for (const week of weeks) {
          updates.push(supabase.from('weekly_dues').upsert({
            student_id: student.student_id,
            week_number: week,
            month: selectedMonth,
            year: selectedYear,
            amount: status === 'paid' ? 5000 : 0,
            status: status
          }, { onConflict: 'student_id, week_number, month, year' }));
        }
      }

      await Promise.all(updates);
      toast.success(`Berhasil set ${actionLabel} Semua Minggu (W1-W4) untuk kelas ini!`);
      fetchStudentMatrix(); // Refresh
      fetchDuesTotal(); // Refresh totals if paid
    } catch (err) {
      toast.error("Gagal melakukan batch update all weeks.");
    } finally {
      setIsLoadingMatrix(false);
    }
  };

  const displayedTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (transactionFilter !== 'all' && tx.type !== transactionFilter) return false;
      if (isLifetime) return !tx.class_id;
      const txDate = new Date(tx.transaction_date);
      return tx.class_id === selectedClassId && txDate.getMonth() + 1 === selectedMonth && txDate.getFullYear() === selectedYear;
    });
  }, [transactions, transactionFilter, isLifetime, selectedClassId, selectedMonth, selectedYear]);

  const totalDisplayedIncome = useMemo(() => displayedTransactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0), [displayedTransactions]);
  const totalDisplayedExpense = useMemo(() => displayedTransactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0), [displayedTransactions]);

  const getStatusIcon = (status: string) => { switch (status) { case 'paid': return <Check className="w-4 h-4" />; case 'pending': return <Clock className="w-4 h-4" />; case 'bebas': return <Unlock className="w-4 h-4" />; case 'unpaid': return <X className="w-4 h-4" />; default: return <span className="text-xs">-</span>; } };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Keuangan</h1>
        <p className="text-muted-foreground mt-1">Laporan kas angkatan PTIK 2025</p>
      </div>

      {/* STATS GRID - STANDARDIZED PREMIUM CARDS */}
      <div key={`${selectedClassId}-${selectedMonth}-${selectedYear}-${isLifetime ? 'life' : 'monthly'}`} className="animate-in fade-in duration-200">

        {/* ✅ WIDGET BARU: Aggregate Balance Angkatan (Hanya di Lifetime) */}
        {isLifetime && (
          <div className="mb-6">
            <PremiumCard
              centered={true}
              icon={TrendingUp}
              title="Total Saldo Bersih Angkatan (Aggregated)"
              subtitle="Validasi: Total Iuran (4 Kelas) + Total Hibah - Pengeluaran Angkatan"
              value={isLoadingStats ? <Skeleton className="h-9 w-48 bg-emerald-500/10" /> : formatIDR(batchNetBalance)}
              gradient="from-emerald-500/20 to-emerald-500/5"
              iconClassName="bg-emerald-500/10 text-emerald-600"
              className="w-full"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 2xl:grid-cols-4 gap-4 mb-6">
          <PremiumCard
            icon={Users}
            title={`Saldo Kas ${selectedClassName}`}
            subtitle={isLifetime ? `Total iuran terbayar ${selectedClassName} (12 bulan)` : `Total iuran terbayar ${selectedClassName} bulan ini`}
            value={isLoadingStats ? <Skeleton className="h-9 w-24 bg-purple-500/10" /> : formatIDR(classDuesTotal)}
            gradient="from-purple-500/20 to-purple-500/5"
            iconClassName="bg-purple-500/10 text-purple-600"
          />
          <PremiumCard
            icon={Wallet}
            title="Total Kas Angkatan"
            subtitle={isLifetime ? "Total iuran terbayar dari seluruh kelas (A, B, C, D)" : "Total iuran terbayar seluruh kelas bulan ini"}
            value={isLoadingStats ? <Skeleton className="h-9 w-32 bg-blue-500/10" /> : formatIDR(totalKasAngkatan)}
            gradient="from-blue-500/20 to-blue-500/5"
            iconClassName="bg-blue-500/10 text-blue-600"
          />
          <PremiumCard
            icon={Gift}
            title={isLifetime ? "Total Pemasukan Lain" : `Hibah/Pemasukan ${selectedClassName}`}
            subtitle={isLifetime ? "Pemasukan Angkatan di luar iuran" : "Hibah/Donasi masuk bulan ini"}
            value={isLoadingStats ? <Skeleton className="h-9 w-24 bg-orange-500/10" /> : formatIDR(classSpecificTotalIncome)}
            gradient="from-orange-500/20 to-orange-500/5"
            iconClassName="bg-orange-500/10 text-orange-600"
          />
          <PremiumCard
            icon={Wallet}
            title={isLifetime ? `Saldo Bersih ${selectedClassName} Lifetime` : `Saldo Bersih ${selectedClassName}`}
            subtitle={isLifetime ? `Iuran + Hibah - Pengeluaran (12 bulan)` : `Iuran + Hibah - Pengeluaran (bulan ini)`}
            value={isLoadingStats ? <Skeleton className="h-9 w-32 bg-indigo-500/10" /> : formatIDR(saldoBersih)}
            gradient="from-indigo-500/20 to-indigo-500/5"
            iconClassName="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
            titleClassName={saldoBersih < 0 ? "text-rose-500" : ""}
          />
        </div>

        {isLifetime && currentUser && currentUser.role !== 'admin_dosen' && (
          <div className="animate-in fade-in duration-200 mb-6">
            <FinancialChart transactions={transactions} selectedClassId={selectedClassId} selectedClassName={selectedClassName} currentSaldo={saldoBersih} className="w-full" />
          </div>
        )}

        {/* V8.2: TWO-TIER PROFESSIONAL HEADER */}
        <div className="rounded-2xl overflow-hidden border border-border shadow-sm mb-6 bg-card">

          {/* TIER 1: BRANDING BAR (Dark Mode Style) */}
          <div className="relative px-6 py-6 border-b flex justify-between items-center transition-all duration-500 overflow-hidden
    /* Background Dasar: Putih Bersih di Light, Hitam Deep di Dark */
    bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-900">
  
  {/* LAYER GRADASI LIGHT MODE (Paling Pas - Blue 200, Purple 200, Emerald 100) */}
  <div className="absolute inset-0 opacity-100 dark:opacity-0 pointer-events-none 
      bg-gradient-to-br from-blue-200 via-purple-200 to-emerald-100"></div>
  
  {/* LAYER GRADASI DARK MODE (Deep & Muted - Tidak Keterangan) 
      Menggunakan Opacity rendah agar warna pastelnya tetap 'kereng' tapi gelap */}
  <div className="absolute inset-0 opacity-0 dark:opacity-100 pointer-events-none 
      bg-gradient-to-br from-blue-950/90 via-indigo-950/60 to-emerald-950/40"></div>

  {/* Soft White Gloss (Hanya aktif di Light Mode agar tidak silau di Dark) */}
  <div className="absolute top-0 left-0 w-full h-full opacity-30 dark:opacity-0 pointer-events-none bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.8),transparent_60%)]"></div>

  <div className="relative z-10 flex flex-col">
    <h2 className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-3
        /* Adaptive Text: Hitam Pekat di Light, Putih Bersih di Dark */
        text-slate-950 dark:text-white">
      <div className="p-2 rounded-xl bg-white/40 dark:bg-white/5 backdrop-blur-md border border-white/40 dark:border-white/10 shadow-sm">
        <Wallet className="w-6 h-6 text-slate-900 dark:text-white" />
      </div>
      Management Kas Angkatan
    </h2>
    <p className="text-xs md:text-sm mt-1 font-bold
        /* Adaptive Subtitle: Slate di Light, Slate Redup di Dark */
        text-slate-700 dark:text-slate-400">
      Control Panel Keuangan Terpusat
    </p>
  </div>

  <div className="hidden md:block relative z-10">
    <span className="text-[10px] font-black tracking-widest uppercase px-4 py-2 rounded-full border shadow-sm transition-all
        /* Badge: Menyesuaikan Kontras */
        bg-white/40 text-slate-900 border-white/60
        dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800">
      V1-PTIK
    </span>
  </div>
</div>

          {/* TIER 2: CONTROL BAR (Lighter Control Panel) */}
          <div className="bg-white dark:bg-slate-950 px-6 py-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

            {/* LEFT: FILTER GROUP */}
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full md:w-auto">

              {/* Period Selector */}
              <div className="relative">
                <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select
                  value={selectedMonth.toString()}
                  onValueChange={(val) => handleMonthChange(Number(val))}
                  disabled={isLoadingConfig && selectedMonth === 0} // Only disable if loading and we have nothing
                >
                  <SelectTrigger className="w-full sm:w-[160px] pl-9 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Pilih Periode" />
                    {isLoadingConfig && <Loader2 className="w-3 h-3 animate-spin ml-2 text-muted-foreground" />}
                  </SelectTrigger>
                  <SelectContent>
                    {months.map(m => (
                      <SelectItem key={m.value} value={m.value.toString()}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* V9.6 Exclusive Admin Control: Only AdminDev & AdminKelas can see this */}
              {(currentUser?.role === 'admin_dev' || currentUser?.role === 'admin_kelas') && isLifetime && (
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-md border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in duration-300">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 ml-2 mr-1">Dari</span>
                  <Select value={String(billingStart || 1)} onValueChange={(v) => updateBillingRange(Number(v), billingEnd || 6, selectedMonth)} disabled={isUpdatingConfig}>
                    <SelectTrigger className="w-[100px] h-8 text-xs bg-white dark:bg-slate-950 border-0 shadow-sm focus:ring-0">
                      <SelectValue />
                      {isLoadingConfig && <Loader2 className="w-3 h-3 animate-spin ml-1 text-muted-foreground" />}
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-400 mx-1">Sampai</span>

                  <Select value={String(billingEnd || 6)} onValueChange={(v) => updateBillingRange(billingStart || 1, Number(v), selectedMonth)} disabled={isUpdatingConfig}>
                    <SelectTrigger className="w-[100px] h-8 text-xs bg-white dark:bg-slate-950 border-0 shadow-sm focus:ring-0">
                      <SelectValue />
                      {isLoadingConfig && <Loader2 className="w-3 h-3 animate-spin ml-1 text-muted-foreground" />}
                    </SelectTrigger>
                    <SelectContent>
                      {months.map(m => (
                        <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {isUpdatingConfig && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground ml-1" />}
                </div>
              )}

              {/* Class Selector (Unified Dropdown for All Views) */}
              <div className="relative">
                <Users className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground z-10" />
                <Select value={selectedClassId} onValueChange={(val) => handleClassChange(val)}>
                  <SelectTrigger className="w-full sm:w-[150px] pl-9 font-medium bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <SelectValue placeholder="Pilih Kelas" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id} className="font-medium">
                        Kelas {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* RIGHT: ACTION GROUP */}
            <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
              {/* V8.0: Class Actions (Visible ONLY in Monthly View) */}
              {!isLifetime && ['admin_dev', 'admin_class'].includes(currentUser?.role || '') && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50">
                      <Zap className="w-4 h-4" /> Aksi Kelas
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Set Lunas Mingguan (Rp 5.000)</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBatchUpdateAllWeeks('paid')}>
                      <Check className="w-4 h-4 mr-2 text-blue-500" />
                      Set Semua Lunas (W1-W4)
                    </DropdownMenuItem>
                    {[1, 2, 3, 4].map(w => (
                      <DropdownMenuItem key={`paid-${w}`} onClick={() => handleBatchUpdateWeek(w, 'paid')}>
                        <Check className="w-4 h-4 mr-2 text-blue-500" />
                        Set Lunas (Minggu {w})
                      </DropdownMenuItem>
                    ))}

                    <DropdownMenuSeparator />
                    <DropdownMenuLabel>Set Bebas Kas Mingguan (Rp 0)</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleBatchUpdateAllWeeks('bebas')}>
                      <Unlock className="w-4 h-4 mr-2 text-slate-500" />
                      Set Semua Bebas Kas (W1-W4)
                    </DropdownMenuItem>
                    {[1, 2, 3, 4].map(w => (
                      <DropdownMenuItem key={`bebas-${w}`} onClick={() => handleBatchUpdateWeek(w, 'bebas')}>
                        <Unlock className="w-4 h-4 mr-2 text-slate-500" />
                        Set Bebas Kas (Minggu {w})
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {(currentUser?.role === 'admin_dev' || currentUser?.role === 'admin_kelas') && (
                <Button onClick={handleDownloadExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md hover:shadow-lg transition-all">
                  <Download className="w-4 h-4" /> Export Excel
                </Button>
              )}
            </div>

          </div>
        </div>
        <div className="overflow-x-auto pb-4">
          {isLoadingMatrix ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground animate-pulse">Memuat data matrix...</p>
            </div>
          ) : fetchError ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3 bg-destructive/5 rounded-xl border border-destructive/20 mb-6">
              <AlertCircle className="w-10 h-10 text-destructive" />
              <h3 className="text-lg font-semibold text-destructive">Gagal Memuat Data</h3>
              <p className="text-sm text-muted-foreground max-w-md">{fetchError}</p>
              <Button variant="outline" size="sm" onClick={() => fetchStudentMatrix()} className="mt-2">
                Coba Lagi
              </Button>
            </div>
          ) : matrixData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center gap-4 bg-muted/20 rounded-xl border border-dashed border-border mb-6">
              <div className="rounded-xl border border-gray-200 p-3 overflow-hidden shadow-sm">
                <Folder className="w-10 h-10 text-muted-foreground opacity-50" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-foreground">Data Tidak Ditemukan</h3>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Belum ada data mahasiswa atau transaksi di kelas ini untuk periode yang dipilih.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <table className="w-full hidden md:table">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">Nama Mahasiswa</th>
                    {!isLifetime ? (
                      weeks.map((week) => (
                        <th key={week} className="text-center py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">
                          {week}
                        </th>
                      ))
                    ) : (
                      <>
                        <th className="text-center py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">Total Bulan Update</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">Total Nominal Kurang</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map((student) => (
                    <tr key={student.student_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                      <td className="py-2 px-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        <div className="flex items-center justify-between gap-2 overflow-hidden">
                          <span className="truncate">{student.name}</span>
                          {['admin_dev', 'admin_class'].includes(currentUser?.role || '') && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Aksi Cepat Iuran</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleBulkUpdate(student.student_id, student.name, 'paid')}>
                                  <Check className="w-4 h-4 mr-2 text-blue-500" />
                                  Set Semua Lunas (W1-W4)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkUpdate(student.student_id, student.name, 'pending')}>
                                  <Clock className="w-4 h-4 mr-2 text-cyan-500" />
                                  Set Semua Pending (W1-W4)
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleBulkUpdate(student.student_id, student.name, 'reset')}>
                                  <X className="w-4 h-4 mr-2 text-rose-500" />
                                  Reset / Belum Bayar (W1-W4)
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </td>
                      {!isLifetime ? (
                        student.payments.map((status, weekIdx) => (
                          <td key={weekIdx} className="py-2 px-4 text-center">
                            <div
                              onClick={() => handleCellClick(student.student_id, student.name, weekIdx)}
                              className={cn(
                                "w-9 h-9 rounded-lg flex items-center justify-center mx-auto border transition-all",
                                status === 'paid' ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                                  status === 'pending' ? "bg-cyan-500/10 text-cyan-600 border-cyan-200" :
                                    status === 'bebas' ? "bg-slate-500/10 text-slate-600 border-slate-200" :
                                      "bg-rose-500/10 text-rose-600 border-rose-200",
                                canEdit() ? "cursor-pointer hover:scale-110 shadow-sm" : "cursor-not-allowed opacity-80"
                              )}
                            >
                              {getStatusIcon(status)}
                            </div>
                          </td>
                        ))
                      ) : (
                        <>
                          <td className="py-2 px-4 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">{student.lifetime_paid_count} Bulan</td>
                          <td className="py-2 px-4 text-center text-sm">
                            {(student.lifetime_deficiency_amount || 0) > 0 ? (
                              <span className="font-bold text-red-600 dark:text-red-400 text-sm">- {formatIDR(student?.lifetime_deficiency_amount || 0)}</span>
                            ) : (
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{formatIDR(0)}</span>
                            )}
                          </td>
                          <td className="py-2 px-4 text-center text-sm">
                            {student.lifetime_deficiency && student.lifetime_deficiency.length > 0 ? (
                              <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 text-[10px] font-bold inline-block">
                                {student.lifetime_deficiency.map((msg, idx) => msg).join(' + ')}
                              </span>
                            ) : (student.lifetime_total || 0) === 0 ? (
                              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-[10px] font-bold inline-block">Belum Bayar</span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px] font-bold inline-block">✓ Lunas</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-3 md:hidden">
                {matrixData.map((student) => (
                  <div key={student.student_id} className="p-4 rounded-2xl border border-border/50 bg-muted/20 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate pr-2">
                        {student.name}
                      </div>
                      {['admin_dev', 'admin_class'].includes(currentUser?.role || '') && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Aksi Cepat</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBulkUpdate(student.student_id, student.name, 'paid')}>
                              <Check className="w-4 h-4 mr-2 text-blue-500" /> Lunas W1-W4
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkUpdate(student.student_id, student.name, 'pending')}>
                              <Clock className="w-4 h-4 mr-2 text-cyan-500" /> Pending W1-W4
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkUpdate(student.student_id, student.name, 'reset')}>
                              <X className="w-4 h-4 mr-2 text-rose-500" /> Reset W1-W4
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {!isLifetime ? (
                      <div className="flex justify-between items-center bg-background/50 p-2 rounded-xl border border-border/30">
                        {student.payments.map((status, weekIdx) => (
                          <div key={weekIdx} className="flex flex-col items-center gap-1">
                            <span className="text-[9px] font-bold text-muted-foreground">W{weekIdx + 1}</span>
                            <div
                              onClick={() => handleCellClick(student.student_id, student.name, weekIdx)}
                              className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center border transition-all",
                                status === 'paid' ? "bg-blue-500/10 text-blue-600 border-blue-200" :
                                  status === 'pending' ? "bg-cyan-500/10 text-cyan-600 border-cyan-200" :
                                    status === 'bebas' ? "bg-slate-500/10 text-slate-600 border-slate-200" :
                                      "bg-rose-500/10 text-rose-600 border-rose-200",
                                canEdit() ? "cursor-pointer active:scale-90" : "opacity-80"
                              )}
                            >
                              {getStatusIcon(status)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Total Bulan:</span>
                          <span className="font-bold">{student.lifetime_paid_count} Bulan</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">Kekurangan:</span>
                          <span className={cn("font-bold", (student.lifetime_deficiency_amount || 0) > 0 ? "text-rose-600" : "text-slate-900 dark:text-slate-100")}>
                            {formatIDR(student?.lifetime_deficiency_amount || 0)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1">
                          <span className="text-muted-foreground">Status:</span>
                          {student.lifetime_deficiency && student.lifetime_deficiency.length > 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 font-bold">
                              {student.lifetime_deficiency.join(' + ')}
                            </span>
                          ) : (student.lifetime_total || 0) === 0 ? (
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 font-bold">Belum Bayar</span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-bold">✓ Lunas</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ✅ LOGIKA BARU: Sembunyikan Tabel Transaksi jika di mode Lifetime */}
      {!isLifetime && (
        <div className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-bold text-foreground">{isLifetime ? "Data Transaksi Angkatan" : "Transaksi Terakhir"}</h2>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 no-scrollbar">
              <div className="flex gap-1 bg-muted/50 p-1.5 rounded-xl shrink-0">
                {['all', 'income', 'expense'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setTransactionFilter(f as any)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-lg transition-all",
                      transactionFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {f === 'all' ? 'Semua' : f === 'income' ? 'Masuk' : 'Keluar'}
                  </button>
                ))}
              </div>
              {canEdit() && (
                <div className="shrink-0">
                  <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
                    <DialogTrigger asChild>
                      <Button className="primary-gradient gap-2 h-11 px-5 rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all">
                        <Plus className="w-4 h-4" /> Tambah Transaksi
                      </Button>
                    </DialogTrigger>
                    {/* DialogContent ... existing */}
                    <DialogContent className="glass-card border-border sm:max-w-[425px]">
                      <DialogHeader><DialogTitle className="text-xl font-bold text-foreground">Catat Transaksi Angkatan</DialogTitle></DialogHeader>
                      <div className="space-y-5 py-4">
                        <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                          <Button variant={newTx.type === 'income' ? 'default' : 'ghost'} className={cn("flex-1 h-10", newTx.type === 'income' && "bg-blue-600 text-white")} onClick={() => setNewTx({ ...newTx, type: 'income', category: 'hibah' })}>Pemasukan</Button>
                          <Button variant={newTx.type === 'expense' ? 'default' : 'ghost'} className={cn("flex-1 h-10", newTx.type === 'expense' && "bg-rose-600 text-white")} onClick={() => setNewTx({ ...newTx, type: 'expense', category: 'Umum' })}>Pengeluaran</Button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Keterangan / Deskripsi</label>
                          <Input placeholder="Contoh: Sewa Sound System" className="bg-background/50 h-12 rounded-xl border-input focus:ring-2 focus:ring-primary/20 shadow-sm" value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2 col-span-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nominal (Rp)</label>
                            <Input type="text" placeholder="0" className="bg-background/50 h-12 rounded-xl border-input font-black text-primary shadow-sm focus:ring-2 focus:ring-primary/20" value={displayAmount} onChange={e => handleAmountChange(e.target.value)} />
                          </div>
                          {isLifetime ? (
                            <div className="space-y-2 col-span-2">
                              <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori (Otomatis)</label>
                              <div className="flex h-12 w-full rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm text-foreground items-center font-bold">
                                General / Angkatan
                              </div>
                            </div>
                          ) : (
                            newTx.type === 'expense' && (
                              <div className="space-y-2 col-span-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori</label>
                                <Select
                                  value={newTx.category}
                                  onValueChange={(val) => setNewTx({ ...newTx, category: val })}
                                >
                                  <SelectTrigger className="h-12 rounded-xl">
                                    <SelectValue placeholder="Pilih Kategori" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Umum">Umum</SelectItem>
                                    <SelectItem value="Event">Event</SelectItem>
                                    <SelectItem value="Perlengkapan">Perlengkapan</SelectItem>
                                    <SelectItem value="Konsumsi">Konsumsi</SelectItem>
                                    <SelectItem value="Admin">Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )
                          )}
                        </div>
                        <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-black h-12 rounded-xl shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg active:scale-95" onClick={handleAddTransaction} disabled={isSubmitting}>
                          {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Transaksi
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {isLoadingStats ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground animate-pulse">Memuat riwayat transaksi...</p>
              </div>
            ) : displayedTransactions.length > 0 ? (
              displayedTransactions.slice(0, 50).map((tx) => (
                <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 group gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", tx.type === 'income' ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600')}> {tx.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />} </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base truncate">{tx.description || tx.category}</p>
                      <div className="flex items-center gap-2 mt-1 overflow-x-auto no-scrollbar whitespace-nowrap">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-black shrink-0">{tx.transaction_date}</span>
                        <span className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full font-black uppercase shrink-0",
                          tx.category === 'hibah' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                            tx.type === 'income' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}>{tx.category}</span>
                        <span className={cn(
                          "text-[9px] px-2 py-0.5 rounded-full font-black uppercase shrink-0",
                          tx.class_id ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        )}>
                          {tx.class_id ? `Kelas ${classes.find(c => c.id === tx.class_id)?.name || '...'}` : 'Angkatan/General'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/30">
                    <span className={cn("font-black text-base whitespace-nowrap", tx?.type === 'income' ? 'text-blue-700 dark:text-blue-500' : 'text-rose-700 dark:text-rose-500')}> {tx?.type === 'income' ? '+' : '-'}{formatIDR(tx?.amount)} </span>
                    {canEdit() && (
                      <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        {(currentUser?.role === 'admin_dev' || currentUser?.class_id === tx.class_id) && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-primary rounded-xl" onClick={() => handleEditClick(tx)}><Pencil className="w-4 h-4" /></Button>
                        )}
                        {currentUser?.role === 'admin_dev' && (
                          <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-xl" onClick={() => handleDeleteTransaction(tx.id)} disabled={isDeleting}><Trash2 className="w-4 h-4" /></Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-3 bg-muted/10 rounded-xl border border-dashed border-border">
                <AlertCircle className="w-8 h-8 text-muted-foreground opacity-30" />
                <p className="text-sm text-muted-foreground">Tidak ada riwayat transaksi pada filter ini.</p>
              </div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            {transactionFilter === 'all' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex justify-between items-center sm:block sm:text-center"><div className="text-xs text-muted-foreground mb-1">Total Pemasukan</div><div className="font-bold text-blue-500">{formatIDR(totalDisplayedIncome)}</div></div>
                <div className="flex justify-between items-center sm:block sm:text-center"><div className="text-xs text-muted-foreground mb-1">Total Pengeluaran</div><div className="font-bold text-rose-500">{formatIDR(totalDisplayedExpense)}</div></div>
                <div className="flex justify-between items-center sm:block sm:text-center p-2 rounded-lg bg-muted/20 border border-border/50"><div className="text-xs text-muted-foreground mb-1">Saldo Akhir (Validasi)</div><div className={cn("font-bold", (totalDisplayedIncome - totalDisplayedExpense) < 0 ? "text-rose-500" : "text-foreground")}>{formatIDR(totalDisplayedIncome - totalDisplayedExpense)}</div></div>
              </div>
            ) : (
              <div className="flex justify-between items-center"><span className="text-sm font-medium text-muted-foreground">{transactionFilter === 'income' ? 'Total Pemasukan' : 'Total Pengeluaran'}</span><span className={cn("text-lg font-bold", transactionFilter === 'income' ? 'text-blue-500' : 'text-rose-500')}>{formatIDR(transactionFilter === 'income' ? totalDisplayedIncome : totalDisplayedExpense)}</span></div>
            )}
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4">
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-blue-500/10 border-blue-200" onClick={() => handleUpdateStatus('paid')} disabled={isUpdating}><Check className="w-6 h-6 text-blue-600" /><span className="text-sm font-medium text-blue-600">Lunas</span></Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-yellow-500/10 border-yellow-200" onClick={() => handleUpdateStatus('pending')} disabled={isUpdating}><Clock className="w-6 h-6 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Pending</span></Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-red-500/10 border-red-200" onClick={() => handleUpdateStatus('unpaid')} disabled={isUpdating}><X className="w-6 h-6 text-red-600" /><span className="text-sm font-medium text-red-600">Belum</span></Button>
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-slate-500/10 border-slate-200" onClick={() => handleUpdateStatus('bebas')} disabled={isUpdating}><Unlock className="w-6 h-6 text-slate-600" /><span className="text-sm font-medium text-slate-600">Bebas Kas</span></Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditTxOpen} onOpenChange={setIsEditTxOpen}>
        <DialogContent className="glass-card border-border sm:max-w-[425px]">
          {editingTx ? (
            <>
              {console.log('DEBUG_MODAL_RENDER:', editingTx)}
              <DialogHeader><DialogTitle className="text-xl font-bold text-foreground">Update Transaksi</DialogTitle></DialogHeader>
              <div className="space-y-5 py-4">
                <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                  <Button variant={editingTx.type === 'income' ? 'default' : 'ghost'} className={cn("flex-1 h-9", editingTx.type === 'income' && "bg-blue-600 text-white")} onClick={() => setEditingTx(prev => prev ? { ...prev, type: 'income' } : null)}>Pemasukan</Button>
                  <Button variant={editingTx.type === 'expense' ? 'default' : 'ghost'} className={cn("flex-1 h-9", editingTx.type === 'expense' && "bg-rose-600 text-white")} onClick={() => setEditingTx(prev => prev ? { ...prev, type: 'expense' } : null)}>Pengeluaran</Button>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Keterangan / Deskripsi</label>
                  <Input placeholder="Contoh: Sewa Sound System" className="bg-background/50 h-11 rounded-xl border-input focus:ring-2 focus:ring-primary/20 shadow-sm" value={editingTx.description} onChange={e => setEditingTx(prev => prev ? { ...prev, description: e.target.value } : null)} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nominal (Rp)</label>
                    <Input
                      type="text"
                      placeholder="0"
                      className="bg-background/50 h-11 rounded-xl border-input font-bold text-primary shadow-sm focus:ring-2 focus:ring-primary/20"
                      value={editingTx?.amount ? new Intl.NumberFormat('id-ID').format(editingTx.amount) : '0'}
                      onChange={e => handleAmountChange(e.target.value, true)}
                    />
                  </div>

                  <div className="space-y-2 col-span-2 text-left">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori</label>
                    <Select
                      value={editingTx.category || undefined}
                      onValueChange={(val) => setEditingTx(prev => prev ? { ...prev, category: val } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hibah">Hibah/Donasi</SelectItem>
                        <SelectItem value="iuran">Iuran Kas</SelectItem>
                        <SelectItem value="kegiatan">Dana Kegiatan</SelectItem>
                        <SelectItem value="lainnya">Lainnya</SelectItem>
                        <SelectItem value="operasional">Operasional</SelectItem>
                        <SelectItem value="konsumsi">Konsumsi</SelectItem>
                        <SelectItem value="perlengkapan">Perlengkapan</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Tanggal</label>
                    <DatePicker
                      date={editingTx.transaction_date ? new Date(editingTx.transaction_date) : undefined}
                      setDate={(date) => setEditingTx(prev => prev ? { ...prev, transaction_date: date ? format(date, "yyyy-MM-dd") : "" } : null)}
                      placeholder="Pilih tanggal"
                      required
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Kelas</label>
                    <Select
                      value={editingTx.class_id || "general"}
                      onValueChange={(val) => setEditingTx(prev => prev ? { ...prev, class_id: val === "general" ? undefined : val } : null)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih Target Kelas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">-- Angkatan (General) --</SelectItem>
                        {classes.map(cls => (
                          <SelectItem key={cls.id} value={cls.id}>
                            Kelas {cls.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12 rounded-xl border-2 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300 font-bold"
                    onClick={() => setIsEditTxOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button className="flex-[2] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold h-12 rounded-xl shadow-md transition-all duration-300 hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/40 active:scale-95" onClick={handleUpdateTransaction} disabled={isUpdating}>
                    {isUpdating ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Perubahan
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center gap-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground font-semibold">Menyiapkan modal transaksi...</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* CONFIRMATION MODAL */}
      {/* NEW GLASS CONFIRMATION MODAL */}
      <GlassConfirmationModal
        isOpen={isGlassConfirmOpen}
        onClose={() => setIsGlassConfirmOpen(false)}
        onConfirm={glassConfirmConfig.onConfirm}
        title={glassConfirmConfig.title}
        message={glassConfirmConfig.message}
      />
      <ConfirmationModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        onConfirm={modalConfig.onConfirm}
        title={modalConfig.title}
        description={modalConfig.description}
        variant={modalConfig.variant}
        confirmText={modalConfig.confirmText}
      />
    </div>
  );
}
