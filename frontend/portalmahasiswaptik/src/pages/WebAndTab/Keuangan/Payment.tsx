import { usePayment } from '@/SharedLogic/hooks/usePayment';
import { motion, Variants } from 'framer-motion';
import { PaymentSelector } from '@/components/Features/Keuangan/PaymentSelector';
import { PaymentQRIS } from '@/components/Features/Keuangan/PaymentQRIS';
import { PaymentNotificationCenter } from '@/components/Features/Dashboard/PaymentNotificationCenter';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12 } }
};
const staggerTop: Variants = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function Payment() {
  const payment = usePayment();

  return (
    <motion.div
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8 pt-12 md:pt-0 pb-16"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      <PaymentNotificationCenter />

      <motion.div variants={staggerTop} layout={false}>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground italic uppercase tracking-tight">Bayar Iuran Kas</h1>
        <p className="text-muted-foreground mt-1 font-medium">Sinkronisasi Otomatis dengan Matrix Iuran</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Card 1: Rincian & Selection */}
        <div className={payment.state.showQRIS ? "lg:col-span-7 xl:col-span-8" : "lg:col-span-12"}>
          <PaymentSelector payment={payment} />
        </div>

        {/* Card 2: QRIS Result (Sticky on Desktop) */}
        {payment.state.showQRIS && (
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
            <PaymentQRIS payment={payment} />
          </div>
        )}
      </div>
    </motion.div>
  );
}
