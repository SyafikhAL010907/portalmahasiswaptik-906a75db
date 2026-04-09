import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, 
  DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Check, Clock, X, Unlock, Save, Plus, 
  Loader2, Wallet, Pencil, AlertCircle
} from 'lucide-react';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { DatePicker } from '@/components/ui/date-picker';
import { format } from "date-fns";
import { cn } from '@/lib/utils';
import { useFinance } from '@/SharedLogic/hooks/useFinance';
import ConfirmationModal from '@/components/ui/ConfirmationModal';
import GlassConfirmationModal from '@/components/ui/GlassConfirmationModal';

interface FinanceModalsProps {
  finance: ReturnType<typeof useFinance>;
}

export function FinanceModals({ finance }: FinanceModalsProps) {
  const { 
    isDialogOpen, selectedCell, isUpdating, localMonth, selectedYear,
    isAddTxOpen, newTx, displayAmount, classes, isEditTxOpen, editingTx,
    isDeleteConfirmOpen, isDeleting
  } = finance.state;

  const { 
    setIsDialogOpen, handleUpdateStatus, setIsAddTxOpen, setNewTx, 
    setDisplayAmount, handleSaveTransaction, setIsEditTxOpen, setEditingTx,
    confirmDeleteTransaction, setIsDeleteConfirmOpen
  } = finance.actions;

  const handleAmountChange = (val: string, target: 'new' | 'edit' = 'new') => {
    const cleanNumber = val.replace(/\D/g, "");
    const numericValue = Number(cleanNumber);
    const formatted = cleanNumber ? new Intl.NumberFormat('id-ID').format(numericValue) : '';
    setDisplayAmount(formatted);
    if (target === 'new') setNewTx(prev => ({ ...prev, amount: numericValue }));
    else setEditingTx(prev => prev ? ({ ...prev, amount: numericValue }) : null);
  };

  return (
    <>
      {/* 1. STATUS UPDATE DIALOG (SYNCED WITH ORIGINAL) */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card rounded-2xl border-border">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Update Status Iuran</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Update status {selectedCell?.studentName} untuk {selectedCell?.weekIndex ? `Minggu ${selectedCell.weekIndex}` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <Button variant="outline" className="flex flex-col h-24 gap-2 hover:bg-blue-500/10 border-blue-200" onClick={() => handleUpdateStatus('paid')} disabled={isUpdating}>
              <Check className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-bold text-blue-600">Lunas</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-24 gap-2 hover:bg-yellow-500/10 border-yellow-200" onClick={() => handleUpdateStatus('pending')} disabled={isUpdating}>
              <Clock className="w-6 h-6 text-yellow-600" />
              <span className="text-sm font-bold text-yellow-600">Pending</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-24 gap-2 hover:bg-red-500/10 border-red-200" onClick={() => handleUpdateStatus('unpaid')} disabled={isUpdating}>
              <X className="w-6 h-6 text-red-600" />
              <span className="text-sm font-bold text-red-600">Belum</span>
            </Button>
            <Button variant="outline" className="flex flex-col h-24 gap-2 hover:bg-slate-500/10 border-slate-200" onClick={() => handleUpdateStatus('bebas')} disabled={isUpdating}>
              <Unlock className="w-6 h-6 text-slate-600" />
              <span className="text-sm font-bold text-slate-600">Bebas Kas</span>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2. ADD TRANSACTION DIALOG (SYNCED WITH ORIGINAL) */}
      <Dialog open={isAddTxOpen} onOpenChange={setIsAddTxOpen}>
        <DialogContent className="glass-card border-border sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20"><Plus className="w-5 h-5 text-primary" /></div>
              Catat Transaksi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
              <Button variant={newTx.type === 'income' ? 'default' : 'ghost'} className={cn("flex-1 h-10 rounded-lg", newTx.type === 'income' && "bg-blue-600 text-white")} onClick={() => setNewTx({ ...newTx, type: 'income', category: 'hibah' })}>Pemasukan</Button>
              <Button variant={newTx.type === 'expense' ? 'default' : 'ghost'} className={cn("flex-1 h-10 rounded-lg", newTx.type === 'expense' && "bg-rose-600 text-white")} onClick={() => setNewTx({ ...newTx, type: 'expense', category: 'Umum' })}>Pengeluaran</Button>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Deskripsi</Label>
              <Input placeholder="Sewa Sound, Hibah BPD, dll" className="h-12 rounded-xl border-muted/30 font-bold" value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Nominal (Rp)</Label>
              <Input placeholder="0" className="h-12 rounded-xl border-muted/30 font-black text-primary text-lg" value={displayAmount} onChange={e => handleAmountChange(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Tanggal</Label>
                <DatePicker 
                  date={newTx.transaction_date ? new Date(newTx.transaction_date) : undefined} 
                  setDate={(d) => setNewTx({ ...newTx, transaction_date: d ? format(d, "yyyy-MM-dd") : "" })} 
                />
              </div>
            </div>
            <Button className="w-full h-14 rounded-2xl primary-gradient font-black text-lg gap-3 shadow-xl" onClick={handleSaveTransaction} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} SIMPAN TRANSAKSI
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 3. EDIT TRANSACTION DIALOG */}
      <Dialog open={isEditTxOpen} onOpenChange={setIsEditTxOpen}>
        <DialogContent className="glass-card border-border sm:max-w-[425px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black italic uppercase tracking-tight flex items-center gap-3">
              <div className="p-2 rounded-xl bg-blue-500/20"><Pencil className="w-5 h-5 text-blue-600" /></div>
              Ubah Transaksi
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="flex gap-2 p-1 bg-muted/50 rounded-xl">
              <Button variant={editingTx?.type === 'income' ? 'default' : 'ghost'} className={cn("flex-1 h-10 rounded-lg", editingTx?.type === 'income' && "bg-blue-600 text-white")} onClick={() => setEditingTx(prev => prev ? ({ ...prev, type: 'income', category: 'hibah' }) : null)}>Pemasukan</Button>
              <Button variant={editingTx?.type === 'expense' ? 'default' : 'ghost'} className={cn("flex-1 h-10 rounded-lg", editingTx?.type === 'expense' && "bg-rose-600 text-white")} onClick={() => setEditingTx(prev => prev ? ({ ...prev, type: 'expense', category: 'Umum' }) : null)}>Pengeluaran</Button>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Deskripsi</Label>
              <Input placeholder="Deskripsi" className="h-12 rounded-xl border-muted/30 font-bold" value={editingTx?.description || ''} onChange={e => setEditingTx(prev => prev ? ({ ...prev, description: e.target.value }) : null)} />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Nominal (Rp)</Label>
              <Input placeholder="0" className="h-12 rounded-xl border-muted/30 font-black text-primary text-lg" value={displayAmount} onChange={e => handleAmountChange(e.target.value, 'edit')} />
            </div>
            <div className="space-y-2">
               <Label className="text-[10px] font-black uppercase tracking-widest ml-1 opacity-60">Tanggal</Label>
               <DatePicker 
                 date={editingTx?.transaction_date ? new Date(editingTx.transaction_date) : undefined} 
                 setDate={(d) => setEditingTx(prev => prev ? ({ ...prev, transaction_date: d ? format(d, "yyyy-MM-dd") : "" }) : null)} 
               />
            </div>
            <Button className="w-full h-14 rounded-2xl primary-gradient font-black text-lg gap-3 shadow-xl" onClick={handleSaveTransaction} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} UPDATE TRANSAKSI
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 4. DELETE CONFIRMATION MODAL */}
      <GlassConfirmationModal
        isOpen={isDeleteConfirmOpen}
        onClose={() => setIsDeleteConfirmOpen(false)}
        onConfirm={confirmDeleteTransaction}
        title="Hapus Transaksi?"
        message="Data ini akan dihapus secara permanen dari server dan tidak bisa dikembalikan."
        variant="destructive"
        isLoading={isDeleting}
        icon={<AlertCircle className="w-8 h-8 text-rose-500" />}
      />
    </>
  );
}
