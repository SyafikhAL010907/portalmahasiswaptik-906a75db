import { motion, Variants } from 'framer-motion';
import { QrCode, AlertCircle } from 'lucide-react';
import { useQRGenerator } from '@/SharedLogic/hooks/useQRGenerator';
import { QRGeneratorConfigCard } from '@/components/Features/Absensi/QRGeneratorConfigCard';
import { QRGeneratorDisplayCard } from '@/components/Features/Absensi/QRGeneratorDisplayCard';

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

export default function QRGenerator() {
  const qr = useQRGenerator();
  const { isAdminDosen, isAdminDev } = qr.state;

  if (!isAdminDosen() && !isAdminDev()) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase tracking-tight italic">Akses Ditolak Bro!</h2>
          <p className="text-muted-foreground mt-2 font-bold italic">
            Hanya Dosen yang dapat mengakses halaman ini
          </p>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerTop}>
        <h1 className="text-4xl font-black flex items-center gap-3 italic uppercase tracking-tighter">
          <QrCode className="w-10 h-10 text-primary" />
          Attendance Generator
        </h1>
        <p className="text-muted-foreground mt-1 font-bold italic">
          Buat QR Code sesi perkuliahan untuk mahasiswa scan bro!
        </p>
      </motion.div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form Section */}
        <motion.div variants={staggerBottom}>
          <QRGeneratorConfigCard qr={qr} />
        </motion.div>

        {/* QR Display Section */}
        <motion.div variants={staggerBottom}>
          <QRGeneratorDisplayCard qr={qr} />
        </motion.div>
      </div>
    </motion.div>
  );
}
