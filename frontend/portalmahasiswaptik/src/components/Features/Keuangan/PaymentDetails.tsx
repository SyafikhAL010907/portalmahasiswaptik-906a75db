import { motion } from 'framer-motion';
import { 
  CheckCircle2, AlertCircle, X, Wallet, Loader2 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatIDR, cn } from '@/lib/utils';
import { usePayment, MONTH_NAMES } from '@/SharedLogic/hooks/usePayment';

interface PaymentDetailsProps {
  payment: ReturnType<typeof usePayment>;
}

export function PaymentDetails({ payment }: PaymentDetailsProps) {
  const { 
    selectedWeeks, totalBill, isPaying, isMahasiswa, isLoading, 
    selectedTotal 
  } = payment.state;
  const { 
    handleToggleWeek, handleCancelSingleItem, handlePayNow 
  } = payment.actions;

  if (selectedWeeks.length === 0) {
    return (
      <div className="glass-card p-10 rounded-2xl border-2 border-dashed border-muted/50 flex flex-col items-center justify-center text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center text-muted-foreground/40">
          <Wallet className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <p className="font-bold text-foreground">Antrean Pembayaran Kosong</p>
          <p className="text-xs text-muted-foreground max-w-[200px]">Silakan pilih minggu kas yang ingin Anda bayar di panel sebelah kiri.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card p-6 rounded-2xl border-none shadow-xl space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-lg tracking-tight">Detail Antrean</h3>
        <Badge variant="secondary" className="rounded-full px-3 py-1 bg-primary/10 text-primary font-bold">
          {selectedWeeks.length} Item
        </Badge>
      </div>

      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {selectedWeeks.map((key) => {
          const [month, week] = key.split('-').map(Number);
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="group flex items-center justify-between p-3 bg-muted/30 rounded-xl hover:bg-muted/50 transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center shadow-sm">
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">Minggu {week}</p>
                  <p className="text-[10px] text-muted-foreground font-medium uppercase">{MONTH_NAMES[month]}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-black">{formatIDR(5000)}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCancelSingleItem(month, week)}
                  className="h-7 w-7 rounded-full text-muted-foreground hover:text-rose-500 hover:bg-rose-50"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="pt-4 border-t border-muted/50 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold text-muted-foreground">Total Tagihan</p>
          <p className="text-2xl font-black text-foreground">{formatIDR(totalBill || selectedTotal)}</p>
        </div>

        <Button
          onClick={handlePayNow}
          disabled={isPaying || isLoading}
          className="w-full h-12 rounded-xl flex items-center justify-center gap-2 primary-gradient shadow-lg shadow-primary/20 font-black tracking-wide"
        >
          {isPaying ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Wallet className="w-5 h-5" />
              Bayar Sekarang
            </>
          )}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground font-medium italic opacity-60">
          * Pembayaran menggunakan QRIS (Dana/Gopay/OVO/ShopeePay)
        </p>
      </div>
    </div>
  );
}
