import { usePayment } from '@/SharedLogic/hooks/usePayment';
import { motion } from 'framer-motion';
import { PaymentSelector } from '@/components/Features/Keuangan/PaymentSelector';
import { PaymentQRIS } from '@/components/Features/Keuangan/PaymentQRIS';
import { PaymentNotificationCenter } from '@/components/Features/Dashboard/PaymentNotificationCenter';

export default function Payment() {
  const payment = usePayment();

  return (
    <motion.div
      className="w-full max-w-4xl mx-auto px-4 space-y-6 pt-8 pb-32"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <PaymentNotificationCenter />

      <div className="flex flex-col gap-1 px-1">
        <h1 className="text-2xl font-black text-foreground italic uppercase tracking-tight">Bayar Iuran Kas</h1>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Sinkronisasi Otomatis Matrix Iuran</p>
      </div>

      <div className="space-y-6">
        <PaymentSelector payment={payment} />
        {payment.state.showQRIS && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <PaymentQRIS payment={payment} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
