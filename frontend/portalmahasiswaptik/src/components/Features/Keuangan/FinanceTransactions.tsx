import { useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, TrendingDown, Plus, Pencil, Trash2, 
  AlertCircle, Calendar 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { cn, formatIDR } from '@/lib/utils';
import { useFinance } from '@/SharedLogic/hooks/useFinance';
import { useAuth } from '@/contexts/AuthContext';

interface FinanceTransactionsProps {
  finance: ReturnType<typeof useFinance>;
}

export function FinanceTransactions({ finance }: FinanceTransactionsProps) {
  const { user } = useAuth();
  const { 
    localMonth, selectedYear, transactions, transactionFilter, 
    dummyTransactionFilter, bottomTableMonth, classes, selectedClassId,
    isLoadingStats, isDeleting 
  } = finance.state;

  const { 
    setTransactionFilter, setDummyTransactionFilter, setBottomTableMonth,
    setIsAddTxOpen, handleEditClick, handleDeleteTransaction 
  } = finance.actions;

  const userProfile = finance.state.userProfile;
  const isLifetime = localMonth === 0;

  const canEditItem = useCallback((targetClassId?: string) => {
    if (!userProfile) return false;
    if (userProfile.role === 'admin_dev') return true;
    if (userProfile.role === 'admin_kelas') {
      return userProfile.class_id === targetClassId;
    }
    return false;
  }, [userProfile]);

  const isAdmin = userProfile?.role === 'admin_dev' || userProfile?.role === 'admin_kelas';

  // --- FILTERED DATA FOR MONTHLY VIEW ---
  const displayedTransactions = useMemo(() => {
    return transactions.filter(tx => {
      if (transactionFilter !== 'all' && tx.type !== transactionFilter) return false;
      if (isLifetime) return !tx.class_id; // Global Angkatan only in top list for Lifetime
      const txDate = new Date(tx.transaction_date);
      return tx.class_id === selectedClassId && txDate.getMonth() + 1 === localMonth && txDate.getFullYear() === selectedYear;
    });
  }, [transactions, transactionFilter, isLifetime, selectedClassId, localMonth, selectedYear]);

  const { processedBottomTransactions } = finance.state;

  if (!isLifetime) {
    return (
      <motion.div layout={false} className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-bold text-foreground">Transaksi Terakhir</h2>
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
            {(userProfile?.role === 'admin_dev' || (userProfile?.role === 'admin_kelas' && userProfile.class_id === selectedClassId)) && (
              <Button onClick={() => setIsAddTxOpen(true)} className="primary-gradient gap-2 h-11 px-5 rounded-xl text-xs font-bold">
                <Plus className="w-4 h-4" /> Tambah Transaksi
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {displayedTransactions.length > 0 ? (
            displayedTransactions.map((tx) => (
              <div key={tx.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50 transition-all hover:bg-muted/50 group gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm", tx.type === 'income' ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600')}>
                    {tx.type === 'income' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm md:text-base truncate">{tx.description || tx.category}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-slate-500 uppercase font-black">{tx.transaction_date}</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-black uppercase">{tx.category}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/30 justify-between sm:justify-end">
                  <span className={cn("font-black text-base whitespace-nowrap", tx.type === 'income' ? 'text-blue-700' : 'text-rose-700')}>
                    {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                  </span>
                  {canEditItem(tx.class_id) && (
                    <div className="flex gap-1.5 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 bg-blue-500/10 hover:bg-blue-500/20" onClick={() => handleEditClick(tx)}><Pencil className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600 bg-rose-500/10 hover:bg-rose-500/20" onClick={() => handleDeleteTransaction(tx.id)} disabled={isDeleting}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-10 opacity-50 text-sm font-medium">Tidak ada riwayat transaksi.</div>
          )}
        </div>
      </motion.div>
    );
  }

  // --- LIFETIME VIEW (GROUPED) ---
  return (
    <motion.div layout={false} className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm mb-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-10">
        <div>
          <h2 className="text-lg font-bold text-foreground">Daftar Transaksi Kas Angkatan</h2>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">Data Transaksi Real-Time (Angkatan & 4 Kelas)</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <div className="flex gap-1 bg-muted/50 p-1.5 rounded-xl">
            {['all', 'income', 'expense'].map((f) => (
              <button key={f} onClick={() => setDummyTransactionFilter(f as any)} className={cn("px-4 py-2 text-xs font-bold rounded-lg transition-all", dummyTransactionFilter === f ? "bg-background text-foreground shadow-sm" : "text-muted-foreground")}>
                {f === 'all' ? 'Semua' : f === 'income' ? 'Masuk' : 'Keluar'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {['Angkatan', 'Kelas A', 'Kelas B', 'Kelas C', 'Kelas D'].map((classGroup) => {
          const filteredTxs = processedBottomTransactions.filter(tx => tx.classLabel === classGroup);
          if (filteredTxs.length === 0) return null;
          return (
            <div key={classGroup} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-px flex-1 bg-border/50"></div>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60 bg-muted/30 px-3 py-1 rounded-full border border-border/30">
                  {classGroup === 'Angkatan' ? 'Transaksi Angkatan' : `Cash Flow ${classGroup}`}
                </span>
                <div className="h-px flex-1 bg-border/50"></div>
              </div>
              <div className="space-y-3">
                {filteredTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-muted/30 border border-border/50">
                    <div className="flex items-center gap-4">
                      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center", tx.type === 'income' ? 'bg-blue-500/10 text-blue-600' : 'bg-red-500/10 text-red-600')}>
                        {tx.type === 'income' ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm truncate">{tx.description || tx.category}</p>
                        <p className="text-[9px] text-muted-foreground font-black uppercase">{tx.transaction_date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("font-black text-sm", tx.type === 'income' ? 'text-blue-700' : 'text-rose-700')}>
                        {tx.type === 'income' ? '+' : '-'}{formatIDR(tx.amount)}
                      </span>
                      {canEditItem(tx.class_id) && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleEditClick(tx)}><Pencil className="w-3 h-3" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-rose-600 hover:bg-rose-50" onClick={() => handleDeleteTransaction(tx.id)} disabled={isDeleting}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
