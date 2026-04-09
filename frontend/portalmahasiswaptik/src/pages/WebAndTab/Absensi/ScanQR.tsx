import { motion, Variants } from 'framer-motion';
import { QrCode, AlertCircle } from 'lucide-react';
import { useScanQR } from '@/SharedLogic/hooks/useScanQR';
import { ScanQRScanner } from '@/components/Features/Absensi/ScanQRScanner';
import { ScanQRInstructions } from '@/components/Features/Absensi/ScanQRInstructions';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};
const staggerTop: Variants = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};
const staggerBottom: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export default function ScanQR() {
  const scan = useScanQR();
  const { user } = scan.state;

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-black uppercase tracking-tight italic">Login Dulu Bro!</h2>
          <p className="text-muted-foreground mt-2 font-bold italic">
            Silakan login terlebih dahulu untuk melakukan absensi
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 pt-12 md:pt-0 pb-24"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerTop}>
        <h1 className="text-4xl font-black flex items-center gap-3 italic uppercase tracking-tighter">
          <QrCode className="w-10 h-10 text-primary" />
          Attendance Scanner
        </h1>
        <p className="text-muted-foreground mt-1 font-bold italic">
          Scan QR Code dari dosen untuk mencatat kehadiran kamu bro!
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="space-y-8">

          {/* Scanner Area */}
          <motion.div variants={staggerBottom}>
            <ScanQRScanner scan={scan} />
          </motion.div>
        </div>

        {/* Instructions */}
        <motion.div variants={staggerBottom}>
           <ScanQRInstructions />
        </motion.div>
      </div>
    </motion.div>
  );
}
