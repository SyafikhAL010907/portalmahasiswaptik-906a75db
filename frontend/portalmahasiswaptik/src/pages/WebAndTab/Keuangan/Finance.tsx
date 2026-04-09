import { useFinance } from '@/SharedLogic/hooks/useFinance';
import { motion } from 'framer-motion';
import { FinanceHeader } from '@/components/Features/Keuangan/FinanceHeader';
import { FinanceStats } from '@/components/Features/Keuangan/FinanceStats';
import { FinanceMatrix } from '@/components/Features/Keuangan/FinanceMatrix';
import { FinanceTransactions } from '@/components/Features/Keuangan/FinanceTransactions';
import { FinanceModals } from '@/components/Features/Keuangan/FinanceModals';
import { FinancialChart } from '@/components/Features/Dashboard/FinancialChart';
import { useAuth } from '@/contexts/AuthContext';

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};

const staggerItem = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

export default function Finance() {
  const finance = useFinance();
  const { user } = useAuth();
  const { localMonth, transactions, selectedClassId, classes, isLoadingStats } = finance.state;

  const isLifetime = localMonth === 0;
  const className = classes.find(c => c.id === selectedClassId)?.name || '...';

  return (
    <motion.div
      className="w-full max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-4 space-y-6 pt-12 md:pt-0 pb-16"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >

      <motion.div variants={staggerItem}>
        <FinanceStats finance={finance} />
      </motion.div>

      {isLifetime && user && (user as any).role !== 'admin_dosen' && (
        <motion.div variants={staggerItem} className="animate-in fade-in duration-500">
          <FinancialChart 
            transactions={transactions} 
            selectedClassId={selectedClassId} 
            selectedClassName={className} 
            currentSaldo={finance.state.manualSummary.balance} 
            className="w-full" 
          />
        </motion.div>
      )}

      <motion.div variants={staggerItem}>
        <FinanceHeader finance={finance} />
      </motion.div>

      <motion.div variants={staggerItem} className="glass-card rounded-2xl p-6 bg-card border border-border shadow-sm">
        <FinanceMatrix finance={finance} />
      </motion.div>

      <motion.div variants={staggerItem}>
        <FinanceTransactions finance={finance} />
      </motion.div>

      <FinanceModals finance={finance} />
    </motion.div>
  );
}
