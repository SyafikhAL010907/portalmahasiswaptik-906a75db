import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, ArrowRight, Download, Plus, Loader2, Save, Wallet, Pencil, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import XLSX from 'xlsx-js-style';

interface Transaction {
  id: string; 
  type: 'income' | 'expense';
  description: string;
  amount: number;
  transaction_date: string;
  category: string;
  created_by?: string;
  class_id?: string; 
}

export default function Transparency() {
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [duesIncome, setDuesIncome] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null); 
  const [validClassId, setValidClassId] = useState<string | null>(null); 
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [displayAmount, setDisplayAmount] = useState(''); 

  const [newTx, setNewTx] = useState<Partial<Transaction>>({
    type: 'expense',
    description: '',
    amount: 0,
    transaction_date: new Date().toISOString().split('T')[0],
    category: 'Umum'
  });

  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const checkUserAndClass = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
      setUserRole(roleData?.role || 'user');
      setCurrentUserId(user.id);
      const { data: cls } = await supabase.from('classes').select('id').limit(1).single();
      if (cls) setValidClassId(cls.id);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: manualTx, error: manualError } = await supabase
        .from('transactions')
        .select('*')
        .order('transaction_date', { ascending: false });

      if (manualError) throw manualError;

      const { count, error: duesError } = await supabase
        .from('weekly_dues').select('*', { count: 'exact', head: true }).eq('status', 'paid');

      if (duesError) throw duesError;
      
      setDuesIncome((count || 0) * 5000);
      setTransactions((manualTx as any) || []);
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUserAndClass();
    fetchData();
  }, [checkUserAndClass, fetchData]);

  const handleAmountChange = (val: string, isEdit = false) => {
    const cleanNumber = val.replace(/\D/g, ""); 
    const formatted = cleanNumber.replace(/\B(?=(\d{3})+(?!\d))/g, "."); 
    
    if (isEdit) {
      setEditingTx(prev => prev ? { ...prev, amount: Number(cleanNumber) } : null);
    } else {
      setDisplayAmount(formatted);
      setNewTx(prev => ({ ...prev, amount: Number(cleanNumber) }));
    }
    return formatted;
  };

  const isSuperAdmin = userRole === 'admin_dev'; 

  // --- CRUD FUNCTIONS ---

  const handleAddTransaction = async () => {
    if (!isSuperAdmin) return;
    if (!newTx.description || !newTx.amount || newTx.amount <= 0) {
      toast.error("Isi data dengan lengkap!");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        type: newTx.type,
        description: newTx.description,
        amount: Number(newTx.amount),
        transaction_date: newTx.transaction_date,
        category: newTx.category || 'Umum',
        created_by: currentUserId,
        class_id: validClassId 
      };

      const { error } = await supabase.from('transactions').insert([payload]);
      if (error) throw error;

      toast.success("Transaksi Berhasil Dicatat!");
      setNewTx({ type: 'expense', description: '', amount: 0, transaction_date: new Date().toISOString().split('T')[0], category: 'Umum' });
      setDisplayAmount('');
      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Gagal simpan: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Yakin mau hapus transaksi ini bro?")) return;
    
    try {
      const { error } = await supabase.from('transactions').delete().eq('id', id);
      if (error) throw error;
      toast.success("Transaksi berhasil dihapus!");
      fetchData();
    } catch (error: any) {
      toast.error("Gagal hapus: " + error.message);
    }
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setDisplayAmount(tx.amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
    setIsEditDialogOpen(true);
  };

  const handleUpdateTransaction = async () => {
    if (!editingTx) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('transactions')
        .update({
          type: editingTx.type,
          description: editingTx.description,
          amount: Number(editingTx.amount),
          category: editingTx.category,
          transaction_date: editingTx.transaction_date
        })
        .eq('id', editingTx.id);

      if (error) throw error;
      toast.success("Transaksi berhasil diupdate!");
      setIsEditDialogOpen(false);
      fetchData();
    } catch (error: any) {
      toast.error("Gagal update: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportExcel = () => {
    const excelData: any[][] = [
      ["LAPORAN TRANSPARANSI KAS ANGKATAN PTIK 2025"],
      [`Per Tanggal: ${new Date().toLocaleDateString('id-ID')}`],
      [],
      ["No", "Tanggal", "Deskripsi", "Kategori", "Tipe", "Nominal (Rp)"],
      [1, "-", "Total Iuran Mahasiswa (Otomatis)", "Iuran", "INCOME", duesIncome]
    ];
    transactions.forEach((tx, i) => {
      excelData.push([i + 2, tx.transaction_date, tx.description, tx.category, tx.type.toUpperCase(), tx.amount]);
    });
    const ws = XLSX.utils.aoa_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan");
    XLSX.writeFile(wb, `Laporan_Transparansi_Angkatan.xlsx`);
  };

  const manualIncome = transactions.filter(tx => tx.type === 'income').reduce((sum, tx) => sum + tx.amount, 0);
  const totalExpense = transactions.filter(tx => tx.type === 'expense').reduce((sum, tx) => sum + tx.amount, 0);
  const balance = (manualIncome + duesIncome) - totalExpense;

  return (
    <div className="space-y-6 pt-12 md:pt-0">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Laporan Transparansi</h1>
          <p className="text-muted-foreground mt-1">Status Keuangan Angkatan PTIK 2025</p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="primary-gradient gap-2"><Plus className="w-4 h-4" /> Tambah Transaksi</Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-border sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold text-foreground">Catat Transaksi Angkatan</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-4">
                  <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
                    <Button variant={newTx.type === 'income' ? 'default' : 'ghost'} className={cn("flex-1 h-9", newTx.type === 'income' && "bg-green-600 text-white")} onClick={() => setNewTx({...newTx, type: 'income'})}>Pemasukan</Button>
                    <Button variant={newTx.type === 'expense' ? 'default' : 'ghost'} className={cn("flex-1 h-9", newTx.type === 'expense' && "bg-red-600 text-white")} onClick={() => setNewTx({...newTx, type: 'expense'})}>Pengeluaran</Button>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-muted-foreground uppercase">Keterangan / Deskripsi</label>
                    <Input placeholder="Contoh: Sewa Sound System" className="bg-background/50 h-11" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Nominal (Rp)</label>
                      <Input 
                        type="text" 
                        placeholder="0" 
                        className="bg-background/50 h-11 font-bold text-primary [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                        value={displayAmount} 
                        onChange={e => handleAmountChange(e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Kategori</label>
                      <select className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground" value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})}>
                        <option value="Umum" className='bg-background'>Umum</option>
                        <option value="Event" className='bg-background'>Event</option>
                        <option value="Perlengkapan" className='bg-background'>Perlengkapan</option>
                        <option value="Konsumsi" className='bg-background'>Konsumsi</option>
                        <option value="Admin" className='bg-background'>Admin</option>
                      </select>
                    </div>
                  </div>
                  <Button className="w-full primary-gradient h-12 font-bold" onClick={handleAddTransaction} disabled={isSubmitting}>
                    {isSubmitting ? <Loader2 className="animate-spin w-5 h-5 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan Transaksi
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
          <Link to="/dashboard/finance">
            <Button variant="outline" size="sm" className="gap-2"><ArrowRight className="w-4 h-4" /> Dashboard Kas</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-5 border-l-4 border-purple-500 bg-card/40">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">SALDO KAS ANGKATAN (IURAN)</span>
          <p className="text-2xl font-bold text-purple-500 mt-1">Rp {duesIncome.toLocaleString('id-ID')}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 border-l-4 border-green-500 bg-card/40">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">TOTAL PEMASUKAN (GABUNGAN)</span>
          <p className="text-2xl font-bold text-green-500 mt-1">Rp {(manualIncome + duesIncome).toLocaleString('id-ID')}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 border-l-4 border-red-500 bg-card/40">
          <span className="text-xs font-bold text-muted-foreground">TOTAL PENGELUARAN</span>
          <p className="text-2xl font-bold text-red-500 mt-1">Rp {totalExpense.toLocaleString('id-ID')}</p>
        </div>
        <div className="glass-card rounded-2xl p-5 border-l-4 border-primary bg-card/40">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-tight">SALDO BERSIH (REALTIME)</span>
          <p className="text-2xl font-bold text-primary mt-1">Rp {balance.toLocaleString('id-ID')}</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'income', 'expense'].map((f) => (
            <Button key={f} variant={filter === f ? 'default' : 'ghost'} size="sm" onClick={() => setFilter(f as any)} className={filter === f ? "primary-gradient" : ""}>
              {f === 'all' ? 'Semua' : f === 'income' ? 'Pemasukan' : 'Pengeluaran'}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={handleExportExcel} className="gap-2 border-border/50 hover:bg-muted"><Download className="w-4 h-4" /> Export Excel</Button>
      </div>

      <div className="glass-card rounded-2xl p-6 border-border bg-card/50">
        <div className="space-y-3">
          {transactions.filter(tx => filter === 'all' || tx.type === filter).map((tx) => (
            <div key={tx.id} className="group flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-border/50 hover:bg-muted/50 transition-all">
              <div className="flex items-center gap-4">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", tx.type === 'income' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600')}>
                  {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium text-foreground">{tx.description}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">{tx.transaction_date}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground font-medium uppercase">{tx.category}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <span className={cn("font-black", tx.type === 'income' ? 'text-green-600' : 'text-red-600')}>
                  {tx.type === 'income' ? '+' : '-'}Rp {tx.amount.toLocaleString('id-ID')}
                </span>

                {/* 🚀 ADMIN ACTIONS */}
                {isSuperAdmin && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-500/10" onClick={() => handleOpenEdit(tx)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-500/10" onClick={() => handleDeleteTransaction(tx.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 🚀 MODAL EDIT TRANSAKSI */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-blue-500" /> Edit Transaksi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted-foreground uppercase">Deskripsi</label>
              <Input 
                className="bg-background/50 h-11" 
                value={editingTx?.description || ''} 
                onChange={e => setEditingTx(prev => prev ? {...prev, description: e.target.value} : null)} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Nominal (Rp)</label>
                <Input 
                  className="bg-background/50 h-11 font-bold text-primary" 
                  value={displayAmount} 
                  onChange={e => {
                    const formatted = handleAmountChange(e.target.value, true);
                    setDisplayAmount(formatted);
                  }} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase">Kategori</label>
                <select 
                  className="flex h-11 w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm text-foreground" 
                  value={editingTx?.category || 'Umum'} 
                  onChange={e => setEditingTx(prev => prev ? {...prev, category: e.target.value} : null)}
                >
                  <option value="Umum" className='bg-background'>Umum</option>
                  <option value="Event" className='bg-background'>Event</option>
                  <option value="Perlengkapan" className='bg-background'>Perlengkapan</option>
                  <option value="Konsumsi" className='bg-background'>Konsumsi</option>
                  <option value="Admin" className='bg-background'>Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
              <Button className="flex-1 primary-gradient" onClick={handleUpdateTransaction} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />} Simpan
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
