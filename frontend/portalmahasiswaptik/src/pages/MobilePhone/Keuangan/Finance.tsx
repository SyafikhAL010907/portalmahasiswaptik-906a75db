import { useFinance } from '@/SharedLogic/hooks/useFinance';
import { motion } from 'framer-motion';
import { FinanceHeader } from '@/components/Features/Keuangan/FinanceHeader';
import { FinanceStats } from '@/components/Features/Keuangan/FinanceStats';
import { FinanceMatrix } from '@/components/Features/Keuangan/FinanceMatrix';
import { FinanceTransactions } from '@/components/Features/Keuangan/FinanceTransactions';
import { FinanceModals } from '@/components/Features/Keuangan/FinanceModals';

export default function Finance() {
  const finance = useFinance();

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-4 space-y-6 pt-8 pb-32"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-bold text-foreground">Dashboard Keuangan</h1>
        <p className="text-xs text-muted-foreground font-medium">Laporan kas angkatan PTIK 2025</p>
      </div>

      <FinanceStats finance={finance} />
      
      <FinanceHeader finance={finance} />

      <div className="glass-card rounded-2xl p-4 bg-card border border-border shadow-sm">
        <FinanceMatrix finance={finance} />
      </div>

      <FinanceTransactions finance={finance} />

      <FinanceModals finance={finance} />
    </motion.div>
  );
}
