import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Check, Clock, X, Loader2, AlertCircle, Download, Gift, Pencil, Trash2, Plus, Save, ArrowRight, Folder } from 'lucide-react';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Added DialogTrigger
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
// ✅ WAJIB: Pastikan sudah install 'npm install xlsx-js-style'
import XLSX from 'xlsx-js-style';
import { FinancialChart } from '@/components/dashboard/FinancialChart'; // Added FinancialChart

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
  const [matrixData, setMatrixData] = useState<StudentPayment[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [manualSummary, setManualSummary] = useState<FinanceSummary>({ total_income: 0, total_expense: 0, balance: 0 });
  const [duesTotal, setDuesTotal] = useState<number>(0);
  const [isLoadingMatrix, setIsLoadingMatrix] = useState(false);
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCell, setSelectedCell] = useState<{ studentId: string, studentName: string, weekIndex: number } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [weeks] = useState(['W1', 'W2', 'W3', 'W4']);
  const [classTransactionStats, setClassTransactionStats] = useState<FinanceSummary>({ total_income: 0, total_expense: 0, balance: 0 });
  const [lifetimeDuesTotal, setLifetimeDuesTotal] = useState<number>(0);

  // Add Transaction State
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
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

  // Default to Lifetime mode (0). User can switch to specific months if needed.
  const [selectedMonth, setSelectedMonth] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense'>('all'); // ADDED FILTER STATE

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

      if (selectedClassId && !isLifetime) {
        query = query.eq('class_id', selectedClassId);
      }

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
    if (!selectedClassId) return;
    try {
      const params = new URLSearchParams();
      params.append('class_id', selectedClassId);
      params.append('year', selectedYear.toString());
      if (!isLifetime) {
        params.append('month', selectedMonth.toString());
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/finance/transactions/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setClassTransactionStats(result.data);
        }
      }
    } catch (error) {
      console.error("Gagal fetch class stats:", error);
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

  // TRIGGER fetch after purge
  useEffect(() => {
    if (session) {
      if (transactions.length === 0 && matrixData.length === 0) {
        const fetchData = async () => {
          fetchTransactionStats();
          fetchClassStats();
          fetchStudentMatrix();
          fetchDuesTotal();
        };
        fetchData();
      }
    }
  }, [selectedClassId, selectedMonth, selectedYear, isLifetime, session]);

  // REAL-TIME SUBSCRIPTIONS for Finance Updates ⚡
  useEffect(() => {
    if (!selectedClassId || !session) return;

    // Subscribe to transactions table (filtered by class)
    const txChannel = supabase
      .channel(`finance_transactions_${selectedClassId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'transactions',
          filter: `class_id=eq.${selectedClassId}`
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
    setMatrixData([]);
    setManualSummary({ total_income: 0, total_expense: 0, balance: 0 });
    setDuesTotal(0);
    setLifetimeDuesTotal(0);
    setSelectedClassId(newClassId);
  };

  const handleMonthChange = (newMonth: number) => {
    if (newMonth === selectedMonth) return;
    setIsLoadingStats(true);
    setIsLoadingMatrix(true);
    setTransactions([]);
    setMatrixData([]);
    setManualSummary({ total_income: 0, total_expense: 0, balance: 0 });
    setDuesTotal(0);
    setLifetimeDuesTotal(0);
    setSelectedMonth(newMonth);
  };

  const toggleLifetime = () => {
    setIsLoadingStats(true);
    setIsLoadingMatrix(true);
    setTransactions([]);
    setMatrixData([]);
    setManualSummary({ total_income: 0, total_expense: 0, balance: 0 });
    setDuesTotal(0);
    setLifetimeDuesTotal(0);

    if (selectedMonth === 0) {
      setSelectedMonth(new Date().getMonth() + 1);
    } else {
      setSelectedMonth(0);
    }
  };

  useEffect(() => {
    if (session) {
      fetchTransactionStats();
      fetchClassStats();
    }
  }, [session, selectedMonth, selectedYear, selectedClassId, isLifetime, fetchTransactionStats, fetchClassStats]);

  useEffect(() => {
    if (session) {
      fetchDuesTotal();
    }
  }, [session, selectedMonth, selectedYear, isLifetime, fetchDuesTotal]);

  useEffect(() => {
    const fetchLifetimeTotal = async () => {
      if (!isLifetime) return;
      try {
        const { data, error } = await supabase.from('weekly_dues').select('amount').eq('status', 'paid').eq('year', selectedYear);
        if (error) throw error;
        const total = data?.reduce((sum, item) => sum + item.amount, 0) || 0;
        setLifetimeDuesTotal(total);
      } catch (err) {
        console.error("Gagal fetch lifetime total:", err);
      }
    };
    fetchLifetimeTotal();
  }, [isLifetime, session, selectedYear]);
  const fetchStudentMatrix = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      const { data: validRoles } = await supabase.from('user_roles').select('user_id').in('role', ['mahasiswa', 'admin_kelas'] as any);
      if (!validRoles || validRoles.length === 0) {
        setMatrixData([]);
        return;
      }
      const validUserIds = validRoles.map(r => r.user_id);
      const { data: students } = await supabase.from('profiles').select('user_id, full_name').eq('class_id', selectedClassId).in('user_id', validUserIds).order('full_name');
      if (!students || students.length === 0) { setMatrixData([]); return; }
      const studentIds = students.map(s => s.user_id);

      if (!isLifetime) {
        const queryBuilder = supabase.from('weekly_dues');
        const { data: dues } = await (queryBuilder as any).select('student_id, week_number, status').in('student_id', studentIds).eq('month', selectedMonth).eq('year', selectedYear);
        const duesData = dues || [];
        const mappedData = students.map(student => {
          const statusList = ["unpaid", "unpaid", "unpaid", "unpaid"];
          duesData.forEach(due => {
            if (due.student_id === student.user_id && due.week_number <= 4) statusList[due.week_number - 1] = due.status;
          });
          return { name: student.full_name, student_id: student.user_id, payments: statusList };
        });
        setMatrixData(mappedData);
      } else {
        const queryBuilder = supabase.from('weekly_dues');
        const { data: dues } = await (queryBuilder as any).select('student_id, week_number, month, year, amount').in('student_id', studentIds).eq('status', 'paid').eq('year', selectedYear);
        const studentMap = new Map<string, { totalNominal: number, fullMonths: number, deficiencies: string[], deficiencyAmount: number }>();
        students.forEach(s => { studentMap.set(s.user_id, { totalNominal: 0, fullMonths: 0, deficiencies: [], deficiencyAmount: 0 }); });
        const getMonthKey = (y: number, m: number) => `${y}-${m}`;
        const monthNames = ["", "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
        const aggregation = new Map<string, Map<string, { weeks: Set<number>, amount: number }>>();
        dues?.forEach(d => {
          if (!aggregation.has(d.student_id)) aggregation.set(d.student_id, new Map());
          const monthlyMap = aggregation.get(d.student_id)!;
          const key = getMonthKey(d.year, d.month);
          if (!monthlyMap.has(key)) monthlyMap.set(key, { weeks: new Set(), amount: 0 });
          const entry = monthlyMap.get(key)!;
          entry.weeks.add(d.week_number);
          entry.amount += d.amount;
        });
        aggregation.forEach((monthsMap, studentId) => {
          const stats = studentMap.get(studentId)!;
          monthsMap.forEach((data, timeKey) => {
            stats.totalNominal += data.amount;
            const isFull = data.weeks.size >= 4 || data.amount >= 20000;
            if (isFull) {
              stats.fullMonths += 1;
            } else {
              const [y, m] = timeKey.split('-').map(Number);
              const missing = 4 - data.weeks.size;
              const debt = missing * 5000;
              if (debt > 0) {
                stats.deficiencies.push(`${monthNames[m]} (-${missing} mg)`);
                stats.deficiencyAmount += debt;
              }
            }
          });
        });
        const mappedData = students.map(student => {
          const stats = studentMap.get(student.user_id)!;
          return {
            name: student.full_name,
            student_id: student.user_id,
            payments: [],
            lifetime_paid_count: stats.fullMonths,
            lifetime_total: stats.totalNominal,
            lifetime_deficiency: stats.deficiencies,
            lifetime_deficiency_amount: stats.deficiencyAmount
          };
        });
        setMatrixData(mappedData);
      }
    } catch (error) { console.error(error); }
  }, [selectedClassId, selectedMonth, selectedYear, isLifetime]);

  useEffect(() => {
    setIsLoadingMatrix(true);
    fetchStudentMatrix().then(() => setIsLoadingMatrix(false));
    fetchTransactionStats();
    fetchClassStats();

    const channel = supabase.channel('finance-realtime-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_dues' }, (payload) => {
        fetchStudentMatrix();
        fetchDuesTotal();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, (payload) => {
        toast.info("Data transaksi diperbarui otomatis...", { duration: 1000 });
        fetchTransactionStats();
        fetchClassStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStudentMatrix, fetchDuesTotal, fetchTransactionStats, fetchClassStats]);

  const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

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
    return isLifetime ? lifetimeDuesTotal : duesTotal;
  }, [isLifetime, lifetimeDuesTotal, duesTotal]);

  const danaHibahTotal = useMemo(() => {
    if (isLifetime) {
      return transactions
        .filter(tx => tx.category === 'hibah' && tx.type === 'income' && new Date(tx.transaction_date).getFullYear() === selectedYear)
        .reduce((sum, tx) => sum + tx.amount, 0);
    }
    return transactions.filter(tx =>
      tx.category === 'hibah' &&
      tx.type === 'income' &&
      tx.class_id === selectedClassId &&
      new Date(tx.transaction_date).getMonth() + 1 === selectedMonth &&
      new Date(tx.transaction_date).getFullYear() === selectedYear
    ).reduce((sum, tx) => sum + tx.amount, 0);
  }, [isLifetime, transactions, selectedClassId, selectedMonth, selectedYear]);

  const danaHibahClassSpecific = useMemo(() => {
    let filtered = transactions.filter(tx =>
      tx.category === 'hibah' &&
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

  const totalPemasukan = useMemo(() => classDuesTotal + danaHibahClassSpecific, [classDuesTotal, danaHibahClassSpecific]);

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
      // Monthly mode: YES access for ALL classes (can help manage any class)
      return true;
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
      setMatrixData(prev => prev.map(s => s.student_id === selectedCell.studentId ? { ...s, payments: s.payments.map((p, i) => i === selectedCell.weekIndex - 1 ? newStatus : p) } : s));
      fetchDuesTotal();
      toast.success(`Berhasil update jadi ${newStatus}`);
      setIsDialogOpen(false);
    } catch (error: any) { toast.error("Gagal: " + error.message); } finally { setIsUpdating(false); }
  };

  const handleResetStudentStatus = async (studentId: string, studentName: string) => {
    if (!canEdit()) return;
    if (selectedMonth === 0) {
      toast.error("Pilih bulan spesifik dulu untuk me-reset data iuran.");
      return;
    }

    const monthName = ["", "Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"][selectedMonth];
    if (!confirm(`Hapus data iuran ${monthName} untuk ${studentName}? Tindakan ini tidak bisa dibatalkan.`)) return;

    setIsUpdating(true);
    try {
      const { error } = await (supabase.from('weekly_dues') as any)
        .delete()
        .eq('student_id', studentId)
        .eq('year', selectedYear)
        .eq('month', selectedMonth);

      if (error) throw error;

      toast.success(`Status iuran ${studentName} di bulan ${monthName} berhasil direset.`);
      fetchStudentMatrix(); // Refresh matrix
      fetchDuesTotal();
    } catch (error: any) {
      toast.error("Gagal reset status: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };
  const handleAmountChange = (val: string, isEdit = false) => {
    const cleanNumber = val.replace(/\D/g, "");
    const formatted = cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    if (isEdit && editingTx) { setEditingTx({ ...editingTx, amount: Number(cleanNumber) }); } else { setDisplayAmount(formatted); setNewTx(prev => ({ ...prev, amount: Number(cleanNumber) })); }
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
        category: newTx.type === 'income' ? 'hibah' : newTx.category,
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
    if (!canEdit()) return;
    if (!confirm("Hapus transaksi?")) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      toast.success("Dihapus"); fetchTransactionStats(); fetchClassStats();
    } catch (err: any) { toast.error(err.message); } finally { setIsDeleting(false); }
  };

  const handleEditClick = (tx: Transaction) => { if (canEdit()) { setEditingTx(tx); setIsEditTxOpen(true); } };

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

  const handleDownloadExcel = () => {
    if (matrixData.length === 0) return;
    const title = isLifetime ? `LAPORAN LIFETIME KAS KELAS ${selectedClassName.toUpperCase()}` : `LAPORAN IURAN KAS KELAS ${selectedClassName.toUpperCase()} - ${months.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    const headers = isLifetime ? ["No", "Nama Mahasiswa", "Total Bulan Bayar", "Total Nominal", "Status"] : ["No", "Nama Mahasiswa", "Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4", "Total (Rp)"];
    const dataRow: any[][] = [[title], [`Angkatan PTIK 2025 - Per Tanggal: ${new Date().toLocaleDateString('id-ID')}`], [], headers];
    matrixData.forEach((s, i) => {
      if (isLifetime) { dataRow.push([i + 1, s.name, `${s.lifetime_paid_count || 0}x Bayar`, s.lifetime_total || 0, "Active"]); } else {
        const total = s.payments.filter(p => p === 'paid').length * 5000;
        dataRow.push([i + 1, s.name, s.payments[0]?.toUpperCase() || "BELUM", s.payments[1]?.toUpperCase() || "BELUM", s.payments[2]?.toUpperCase() || "BELUM", s.payments[3]?.toUpperCase() || "BELUM", total]);
      }
    });
    const ws = XLSX.utils.aoa_to_sheet(dataRow);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");
    XLSX.writeFile(wb, `Laporan_Kas_${selectedClassName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
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

  const getStatusIcon = (status: string) => { switch (status) { case 'paid': return <Check className="w-4 h-4" />; case 'pending': return <Clock className="w-4 h-4" />; case 'unpaid': return <X className="w-4 h-4" />; default: return <span className="text-xs">-</span>; } };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Keuangan</h1>
        <p className="text-muted-foreground mt-1">Laporan kas angkatan PTIK 2025</p>
      </div>

      {/* STATS GRID - STANDARDIZED PREMIUM CARDS */}
      <div key={`${selectedClassId}-${selectedMonth}-${selectedYear}-${isLifetime ? 'life' : 'monthly'}`} className="animate-in fade-in duration-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <PremiumCard
            icon={Users}
            title={`Saldo Kas ${selectedClassName}`}
            subtitle={isLifetime ? `Total iuran terbayar ${selectedClassName} (12 bulan)` : `Total iuran terbayar ${selectedClassName} bulan ini`}
            value={isLoadingStats ? <Skeleton className="h-9 w-24 bg-purple-500/10" /> : formatRupiah(classDuesTotal)}
            gradient="from-purple-500/20 to-purple-500/5"
            iconClassName="bg-purple-500/10 text-purple-600"
          />
          <PremiumCard
            icon={Wallet}
            title="Saldo Kas Angkatan"
            subtitle={isLifetime ? "Total iuran terbayar dari 3 kelas (12 bulan)" : "Total iuran terbayar dari 3 kelas bulan ini"}
            value={isLoadingStats ? <Skeleton className="h-9 w-32 bg-blue-500/10" /> : formatRupiah(totalKasAngkatan)}
            gradient="from-blue-500/20 to-blue-500/5"
            iconClassName="bg-blue-500/10 text-blue-600"
          />
          <PremiumCard
            icon={Gift}
            title={isLifetime ? "Dana Hibah Angkatan" : `Dana Hibah ${selectedClassName}`}
            subtitle={isLifetime ? "Total hibah masuk (12 bulan)" : "Total hibah masuk bulan ini"}
            value={isLoadingStats ? <Skeleton className="h-9 w-24 bg-orange-500/10" /> : formatRupiah(danaHibahTotal)}
            gradient="from-orange-500/20 to-orange-500/5"
            iconClassName="bg-orange-500/10 text-orange-600"
          />
          <PremiumCard
            icon={Wallet}
            title={isLifetime ? `Saldo Bersih ${selectedClassName} Lifetime` : `Saldo Bersih ${selectedClassName}`}
            subtitle={isLifetime ? `Iuran + Hibah - Pengeluaran (12 bulan)` : `Iuran + Hibah - Pengeluaran (bulan ini)`}
            value={isLoadingStats ? <Skeleton className="h-9 w-32 bg-indigo-500/10" /> : formatRupiah(saldoBersih)}
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

        <div className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">Matrix Iuran {isLifetime ? 'Lifetime' : 'Bulanan'}</h2>
            <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3 w-full lg:w-auto">
              <select className="h-9 w-full sm:w-[180px] rounded-md border border-input bg-background/50 px-3 py-1 text-sm shadow-sm" value={selectedMonth} onChange={(e) => handleMonthChange(Number(e.target.value))}>
                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
              <div className="flex gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
                {classes.map((cls) => (
                  <Button key={cls.id} variant={selectedClassId === cls.id ? 'default' : 'outline'} size="sm" onClick={() => handleClassChange(cls.id)} className={selectedClassId === cls.id ? 'bg-primary text-primary-foreground whitespace-nowrap font-bold' : 'whitespace-nowrap font-semibold'}> Kelas {cls.name} </Button>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2" onClick={handleDownloadExcel}><Download className="w-4 h-4" /> Export Excel</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            {isLoadingMatrix ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">Nama Mahasiswa</th>
                    {!isLifetime ? (
                      weeks.map((week) => (<th key={week} className="text-center py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">{week}</th>))
                    ) : (
                      <>
                        <th className="text-center py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">Total Bulan Update</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-slate-700 dark:text-slate-300">Total Nominal Kurang</th>
                        <th className="text-center py-4 px-4 text-sm font-bold text-slate700 dark:text-slate-300">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {matrixData.map((student) => (
                    <tr key={student.student_id} className="border-b border-border/40 hover:bg-muted/30 transition-colors group">
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100 text-sm">
                        <div className="flex items-center justify-between">
                          <span>{student.name}</span>
                          {canEdit() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => handleResetStudentStatus(student.student_id, student.name)}
                              title="Reset Bulan Ini"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </td>{!isLifetime ? (
                        student.payments.map((status, weekIdx) => (
                          <td key={weekIdx} className="py-3 px-4 text-center">
                            <div onClick={() => handleCellClick(student.student_id, student.name, weekIdx)} className={cn("w-9 h-9 rounded-lg flex items-center justify-center mx-auto border transition-all", status === 'paid' ? "bg-blue-500/10 text-blue-600 border-blue-200" : status === 'pending' ? "bg-cyan-500/10 text-cyan-600 border-cyan-200" : "bg-rose-500/10 text-rose-600 border-rose-200", canEdit() ? "cursor-pointer hover:scale-110 shadow-sm" : "cursor-not-allowed opacity-80")}> {getStatusIcon(status)} </div>
                          </td>
                        ))
                      ) : (
                        <>
                          <td className="py-3 px-4 text-center text-sm font-semibold text-slate-900 dark:text-slate-100">{student.lifetime_paid_count} Bulan</td>
                          <td className="py-3 px-4 text-center text-sm">
                            {(student.lifetime_deficiency_amount || 0) > 0 ? (
                              <span className="font-bold text-red-600 dark:text-red-400 text-sm">- {formatRupiah(student.lifetime_deficiency_amount || 0)}</span>
                            ) : (
                              <span className="font-semibold text-slate-900 dark:text-slate-100 text-sm">{formatRupiah(0)}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center text-sm">
                            {student.lifetime_deficiency && student.lifetime_deficiency.length > 0 ? (
                              <span className="px-3 py-1 rounded-full bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400 text-xs font-bold inline-block">
                                {student.lifetime_deficiency.map((msg, idx) => msg.replace('(-', '').replace(' mg)', ' mg')).join(' - ')}
                              </span>
                            ) : (student.lifetime_total || 0) === 0 ? (
                              <span className="px-3 py-1 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 text-xs font-bold inline-block">Belum Bayar</span>
                            ) : (
                              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs font-bold inline-block">✓ Lunas</span>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm mb-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
            <h2 className="text-lg font-semibold text-foreground">{isLifetime ? "Data Transaksi Angkatan" : "Transaksi Terakhir"}</h2>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex gap-1 bg-muted/50 p-1 rounded-lg flex-1 md:flex-initial">
                {['all', 'income', 'expense'].map((f) => (
                  <button key={f} onClick={() => setTransactionFilter(f as any)} className={cn("px-3 py-1 text-xs font-medium rounded-md transition-all", transactionFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}> {f === 'all' ? 'Semua' : f === 'income' ? 'Masuk' : 'Keluar'} </button>
                ))}
              </div>
              {canEdit() && (
                <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
                  <DialogTrigger asChild><Button className="primary-gradient gap-2 h-9 text-xs"><Plus className="w-4 h-4" /> Tambah Transaksi</Button></DialogTrigger>
                  <DialogContent className="glass-card border-border sm:max-w-[425px]">
                    <DialogHeader><DialogTitle className="text-xl font-bold text-foreground">Catat Transaksi Angkatan</DialogTitle></DialogHeader>
                    <div className="space-y-5 py-4">
                      <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                        <Button variant={newTx.type === 'income' ? 'default' : 'ghost'} className={cn("flex-1 h-9", newTx.type === 'income' && "bg-blue-600 text-white")} onClick={() => setNewTx({ ...newTx, type: 'income', category: 'hibah' })}>Pemasukan</Button>
                        <Button variant={newTx.type === 'expense' ? 'default' : 'ghost'} className={cn("flex-1 h-9", newTx.type === 'expense' && "bg-rose-600 text-white")} onClick={() => setNewTx({ ...newTx, type: 'expense', category: 'Umum' })}>Pengeluaran</Button>
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-muted-foreground uppercase">Keterangan / Deskripsi</label>
                        <Input placeholder="Contoh: Sewa Sound System" className="bg-background/50 h-11" value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nominal (Rp)</label>
                          <Input type="text" placeholder="0" className="bg-background/50 h-11 font-bold text-primary" value={displayAmount} onChange={e => handleAmountChange(e.target.value)} />
                        </div>
                        {newTx.type === 'expense' && (
                          <div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori</label>
                            <select className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground" value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })}>
                              <option value="Umum">Umum</option><option value="Event">Event</option><option value="Perlengkapan">Perlengkapan</option><option value="Konsumsi">Konsumsi</option><option value="Admin">Admin</option>
                            </select>
                          </div>
                        )}
                        {isLifetime && (
                          <><div className="space-y-2">
                            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Target Dana</label>
                            <select className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground" value={newTx.class_id || ''} onChange={e => setNewTx({ ...newTx, class_id: e.target.value || undefined })}>
                              <option value="">Angkatan (General)</option>
                              {classes.map(cls => (<option key={cls.id} value={cls.id}>{cls.name}</option>))}
                            </select>
                          </div>
                            {newTx.class_id && (
                              <div className={cn("space-y-2", newTx.type === 'income' && "col-span-2")}>
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bulan Transaksi</label>
                                <select className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground" value={selectedTransactionMonth} onChange={e => setSelectedTransactionMonth(Number(e.target.value))}>
                                  {transactionMonths.map(m => (<option key={m.value} value={m.value}>{m.label}</option>))}
                                </select>
                              </div>
                            )}</>
                        )}
                        {!isLifetime && (
                          <div className="col-span-2 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/30">
                            <span className="font-semibold">Konteks otomatis:</span> {selectedClassName} • {months.find(m => m.value === selectedMonth)?.label}
                          </div>
                        )}
                      </div>
                      <Button className="w-full primary-gradient h-12 font-bold" onClick={handleAddTransaction} disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Transaksi
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </div>
          <div className="space-y-3">
            {displayedTransactions.length > 0 ? (
              displayedTransactions.slice(0, 50).map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 group">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0", tx.type === 'income' ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600')}> {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm truncate">{tx.description || tx.category}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-600 dark:text-slate-400 uppercase font-semibold">{tx.transaction_date}</span>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                          tx.category === 'hibah' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' :
                            tx.type === 'income' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                              'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        )}>{tx.category}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("font-bold text-sm whitespace-nowrap", tx.type === 'income' ? 'text-blue-700 dark:text-blue-500' : 'text-rose-700 dark:text-rose-500')}> {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)} </span>
                    {canEdit() && (
                      <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleEditClick(tx)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteTransaction(tx.id)} disabled={isDeleting}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">Belum ada transaksi</div>
            )}
          </div>
          <div className="mt-6 pt-4 border-t border-border">
            {transactionFilter === 'all' ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex justify-between items-center sm:block sm:text-center"><div className="text-xs text-muted-foreground mb-1">Total Pemasukan</div><div className="font-bold text-blue-500">{formatRupiah(totalDisplayedIncome)}</div></div>
                <div className="flex justify-between items-center sm:block sm:text-center"><div className="text-xs text-muted-foreground mb-1">Total Pengeluaran</div><div className="font-bold text-rose-500">{formatRupiah(totalDisplayedExpense)}</div></div>
                <div className="flex justify-between items-center sm:block sm:text-center p-2 rounded-lg bg-muted/20 border border-border/50"><div className="text-xs text-muted-foreground mb-1">Saldo Akhir (Validasi)</div><div className={cn("font-bold", (totalDisplayedIncome - totalDisplayedExpense) < 0 ? "text-rose-500" : "text-foreground")}>{formatRupiah(totalDisplayedIncome - totalDisplayedExpense)}</div></div>
              </div>
            ) : (
              <div className="flex justify-between items-center"><span className="text-sm font-medium text-muted-foreground">{transactionFilter === 'income' ? 'Total Pemasukan' : 'Total Pengeluaran'}</span><span className={cn("text-lg font-bold", transactionFilter === 'income' ? 'text-blue-500' : 'text-rose-500')}>{formatRupiah(transactionFilter === 'income' ? totalDisplayedIncome : totalDisplayedExpense)}</span></div>
            )}
          </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
            <div className="grid grid-cols-3 gap-4 py-4">
              <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-blue-500/10 border-blue-200" onClick={() => handleUpdateStatus('paid')} disabled={isUpdating}><Check className="w-6 h-6 text-blue-600" /><span className="text-sm font-medium text-blue-600">Lunas</span></Button>
              <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-yellow-500/10 border-yellow-200" onClick={() => handleUpdateStatus('pending')} disabled={isUpdating}><Clock className="w-6 h-6 text-yellow-600" /><span className="text-sm font-medium text-yellow-600">Pending</span></Button>
              <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-red-500/10 border-red-200" onClick={() => handleUpdateStatus('unpaid')} disabled={isUpdating}><X className="w-6 h-6 text-red-600" /><span className="text-sm font-medium text-red-600">Belum</span></Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditTxOpen} onOpenChange={setIsEditTxOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Edit Transaksi</DialogTitle></DialogHeader>
            <form onSubmit={handleUpdateTransaction} className="space-y-4 py-4">
              <div className="space-y-2"><label className="text-sm font-medium">Tipe</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={editingTx?.type} onChange={e => setEditingTx(prev => prev ? { ...prev, type: e.target.value as 'income' | 'expense' } : null)}>
                  <option value="income">Pemasukan</option><option value="expense">Pengeluaran</option>
                </select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Nominal (Rp)</label><input type="number" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={editingTx?.amount} onChange={e => setEditingTx(prev => prev ? { ...prev, amount: Number(e.target.value) } : null)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Kategori</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={editingTx?.category} onChange={e => setEditingTx(prev => prev ? { ...prev, category: e.target.value } : null)}>
                  <option value="hibah">Hibah/Donasi</option><option value="iuran">Iuran Kas</option><option value="kegiatan">Dana Kegiatan</option><option value="lainnya">Lainnya</option><option value="operasional">Operasional</option><option value="konsumsi">Konsumsi</option><option value="perlengkapan">Perlengkapan</option>
                </select>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Keterangan</label><input type="text" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={editingTx?.description} onChange={e => setEditingTx(prev => prev ? { ...prev, description: e.target.value } : null)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Tanggal</label><input type="date" className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={editingTx?.transaction_date} onChange={e => setEditingTx(prev => prev ? { ...prev, transaction_date: e.target.value } : null)} /></div>
              <div className="space-y-2"><label className="text-sm font-medium">Target Kelas</label>
                <select className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm" value={editingTx?.class_id || ''} onChange={e => setEditingTx(prev => prev ? { ...prev, class_id: e.target.value || undefined } : null)}>
                  <option value="">-- Angkatan (General) --</option>
                  {classes.map(cls => (<option key={cls.id} value={cls.id}>Kelas {cls.name}</option>))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4"><Button type="button" variant="outline" onClick={() => setIsEditTxOpen(false)}>Batal</Button><Button type="submit" disabled={isUpdating}>Simpan</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}


