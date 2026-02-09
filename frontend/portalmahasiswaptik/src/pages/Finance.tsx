import { useState, useEffect, useCallback, useMemo } from 'react';
import { Wallet, TrendingUp, TrendingDown, Users, Check, Clock, X, Loader2, AlertCircle, Download, Gift } from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
// ✅ WAJIB: Pastikan sudah install 'npm install xlsx-js-style'
import XLSX from 'xlsx-js-style';

// --- INTERFACES ---
interface StudentPayment {
  name: string;
  student_id: string;
  payments: string[];
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

  // 2. FETCH STATS (Transactions)
  const fetchTransactionStats = useCallback(async () => {
    try {
      const { data, error } = await supabase.from('transactions').select('*');
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
        ).slice(0, 5));
      }
    } catch (error) {
      console.error("Gagal ambil stats transaksi:", error);
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  // 3. HITUNG TOTAL IURAN (Supabase)
  const fetchDuesTotal = useCallback(async () => {
    try {
      const { count, error } = await supabase.from('weekly_dues').select('*', { count: 'exact', head: true }).eq('status', 'paid');
      if (!error) setDuesTotal((count || 0) * 5000);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { if (session) { fetchTransactionStats(); fetchDuesTotal(); } }, [session, fetchTransactionStats, fetchDuesTotal]);

  // 🔥 4. FETCH MATRIX (MODIFIED: FILTER DOSEN & ADMIN DEV)
  const fetchStudentMatrix = useCallback(async () => {
    if (!selectedClassId) return;
    try {
      // 1. Ambil user yang hanya berperan sebagai mahasiswa atau admin_kelas
      const { data: validRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['mahasiswa', 'admin_kelas']); // ❌ admin_dev & admin_dosen dilarang masuk

      if (!validRoles || validRoles.length === 0) {
        setMatrixData([]);
        return;
      }
      
      const validUserIds = validRoles.map(r => r.user_id);

      // 2. Tarik profile yang class_id-nya cocok DAN ID-nya ada di daftar valid
      const { data: students } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .eq('class_id', selectedClassId)
        .in('user_id', validUserIds) // 🔥 INI KUNCI FILTERNYA BRO
        .order('full_name');

      if (!students || students.length === 0) { setMatrixData([]); return; }
      
      const studentIds = students.map(s => s.user_id);
      const { data: dues } = await supabase.from('weekly_dues').select('student_id, week_number, status').in('student_id', studentIds);

      const duesData = dues || [];
      const mappedData = students.map(student => {
        const statusList = ["unpaid", "unpaid", "unpaid", "unpaid"];
        duesData.forEach(due => {
          if (due.student_id === student.user_id && due.week_number <= 4) statusList[due.week_number - 1] = due.status;
        });
        return { name: student.full_name, student_id: student.user_id, payments: statusList };
      });
      setMatrixData(mappedData);
    } catch (error) { console.error(error); }
  }, [selectedClassId]);

  // 5. REALTIME LISTENER
  useEffect(() => {
    setIsLoadingMatrix(true);
    fetchStudentMatrix().then(() => setIsLoadingMatrix(false));

    const channel = supabase.channel('db-finance-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'weekly_dues' }, () => {
        setTimeout(() => {
          fetchStudentMatrix();
          fetchDuesTotal();
          fetchTransactionStats();
        }, 300);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchTransactionStats();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchStudentMatrix, fetchDuesTotal, fetchTransactionStats]);

  // --- CALCULATIONS ---
  const formatRupiah = (amount: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);

  const REALTIME_TOTAL_INCOME = manualSummary.total_income + duesTotal;
  const REALTIME_BALANCE = REALTIME_TOTAL_INCOME - manualSummary.total_expense;

  const classDuesTotal = useMemo(() => {
    let countPaid = 0;
    matrixData.forEach(student => {
      countPaid += student.payments.filter(p => p === 'paid').length;
    });
    return countPaid * 5000;
  }, [matrixData]);

  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name || '...';
  const canEdit = () => currentUser?.role === 'admin_dev' || (currentUser?.role === 'admin_kelas' && currentUser?.class_id === selectedClassId);

  const handleCellClick = (studentId: string, studentName: string, weekIdx: number) => {
    if (!canEdit()) return;
    setSelectedCell({ studentId, studentName, weekIndex: weekIdx + 1 });
    setIsDialogOpen(true);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedCell) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase.from('weekly_dues').upsert({
        student_id: selectedCell.studentId,
        week_number: selectedCell.weekIndex,
        status: newStatus,
        amount: 5000
      }, { onConflict: 'student_id, week_number' });

      if (error) throw error;

      setMatrixData(prevData =>
        prevData.map(student => {
          if (student.student_id === selectedCell.studentId) {
            const newPayments = [...student.payments];
            newPayments[selectedCell.weekIndex - 1] = newStatus;
            return { ...student, payments: newPayments };
          }
          return student;
        })
      );

      fetchDuesTotal();
      toast.success(`Berhasil update jadi ${newStatus}`);
      setIsDialogOpen(false);
    } catch (error: any) {
      toast.error("Gagal: " + error.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDownloadExcel = () => {
    if (matrixData.length === 0) {
      toast.error("Tidak ada data untuk didownload");
      return;
    }
    const data: any[][] = [
      [`LAPORAN IURAN KAS KELAS ${selectedClassName.toUpperCase()}`],
      [`Angkatan PTIK 2025 - Per Tanggal: ${new Date().toLocaleDateString('id-ID')}`],
      [],
      ["No", "Nama Mahasiswa", "Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4", "Total (Rp)"]
    ];
    matrixData.forEach((s, i) => {
      const total = s.payments.filter(p => p === 'paid').length * 5000;
      data.push([i + 1, s.name, s.payments[0]?.toUpperCase() || "BELUM", s.payments[1]?.toUpperCase() || "BELUM", s.payments[2]?.toUpperCase() || "BELUM", s.payments[3]?.toUpperCase() || "BELUM", total]);
    });
    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Kas");
    XLSX.writeFile(wb, `Laporan_Kas_${selectedClassName}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getStatusIcon = (status: string) => { switch (status) { case 'paid': return <Check className="w-4 h-4" />; case 'pending': return <Clock className="w-4 h-4" />; case 'unpaid': return <X className="w-4 h-4" />; default: return <span className="text-xs">-</span>; } };

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Dashboard Keuangan</h1>
        <p className="text-muted-foreground mt-1">Laporan kas angkatan PTIK 2025</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard icon={Users} label={`Saldo Kas Kelas ${selectedClassName}`} value={isLoadingMatrix ? "..." : formatRupiah(classDuesTotal)} iconBg="bg-purple-500/10 text-purple-600" />
        <StatCard icon={Wallet} label="Saldo Kas Angkatan" value={isLoadingStats ? "..." : formatRupiah(duesTotal)} trend={{ value: 'Realtime', positive: true }} iconBg="bg-blue-500/10 text-blue-600" />
        <StatCard icon={Gift} label="Dana Hibah/Lainnya" value={isLoadingStats ? "..." : formatRupiah(manualSummary.total_income)} iconBg="bg-orange-500/10 text-orange-600" />
        <StatCard icon={TrendingUp} label="Total Pemasukan" value={isLoadingStats ? "..." : formatRupiah(REALTIME_TOTAL_INCOME)} iconBg="bg-green-500/10 text-green-600" />
        <StatCard icon={TrendingDown} label="Total Pengeluaran" value={isLoadingStats ? "..." : formatRupiah(manualSummary.total_expense)} iconBg="bg-red-500/10 text-red-600" />
      </div>

      <div className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">Matrix Iuran Mingguan</h2>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={handleDownloadExcel}><Download className="w-4 h-4" /> Export Excel</Button>
            <div className="flex gap-2 overflow-x-auto">
              {classes.map((cls) => (
                <Button key={cls.id} variant={selectedClassId === cls.id ? 'default' : 'outline'} size="sm" onClick={() => setSelectedClassId(cls.id)} className={selectedClassId === cls.id ? 'bg-primary text-primary-foreground' : ''}> Kelas {cls.name} </Button>
              ))}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto">
          {isLoadingMatrix ? <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div> : (
            <table className="w-full">
              <thead><tr className="border-b border-border/50"><th className="text-left py-4 px-4 text-sm font-medium text-muted-foreground">Nama Mahasiswa</th>{weeks.map((week) => (<th key={week} className="text-center py-4 px-4 text-sm font-medium text-muted-foreground">{week}</th>))}</tr></thead>
              <tbody>
                {matrixData.map((student) => (
                  <tr key={student.student_id} className="hover:bg-muted/30 transition-colors border-b border-border/50 last:border-0">
                    <td className="py-3 px-4 text-sm text-foreground font-medium">{student.name}</td>
                    {student.payments.map((status, weekIdx) => (
                      <td key={weekIdx} className="py-3 px-4 text-center">
                        <div onClick={() => handleCellClick(student.student_id, student.name, weekIdx)} className={cn("w-9 h-9 rounded-lg flex items-center justify-center mx-auto border transition-all", status === 'paid' ? "bg-green-500/10 text-green-600 border-green-200" : status === 'pending' ? "bg-yellow-500/10 text-yellow-600 border-yellow-200" : "bg-red-500/10 text-red-600 border-red-200", canEdit() ? "cursor-pointer hover:scale-110 shadow-sm" : "cursor-not-allowed opacity-80")}> {getStatusIcon(status)} </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm">
        <h2 className="text-lg font-semibold text-foreground mb-4">Transaksi Terakhir</h2>
        <div className="space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tx.type === 'income' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600')}> {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />} </div>
                <div> <p className="font-medium text-foreground text-sm">{tx.description || tx.category}</p> <p className="text-xs text-muted-foreground">{new Date(tx.transaction_date).toLocaleDateString('id-ID')}</p> </div>
              </div>
              <span className={cn("font-semibold text-sm", tx.type === 'income' ? 'text-green-600' : 'text-red-600')}> {tx.type === 'income' ? '+' : '-'}{formatRupiah(tx.amount)} </span>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Update Status</DialogTitle></DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Button variant="outline" className="flex flex-col h-20 gap-2 hover:bg-green-500/10 border-green-200" onClick={() => handleUpdateStatus('paid')} disabled={isUpdating}><Check className="w-6 h-6 text-green-600" /> Lunas</Button>
            <Button variant="outline" className="flex-col h-20 gap-2 hover:bg-yellow-500/10 border-yellow-200" onClick={() => handleUpdateStatus('pending')} disabled={isUpdating}><Clock className="w-6 h-6 text-yellow-600" /> Pending</Button>
            <Button variant="outline" className="flex-col h-20 gap-2 hover:bg-red-500/10 border-red-200" onClick={() => handleUpdateStatus('unpaid')} disabled={isUpdating}><X className="w-6 h-6 text-red-600" /> Belum</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}