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
      <div className="flex items-center justify-center h-[50vh] px-6">
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
      className="space-y-6 pb-24"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={staggerTop} className="px-1">
        <h1 className="text-3xl font-black flex items-center gap-3 italic uppercase tracking-tighter">
          <QrCode className="w-8 h-8 text-primary" />
          Attendance
        </h1>
        <p className="text-sm text-muted-foreground mt-1 font-bold italic">
          Bikin QR buat mahasiswa absen bro!
        </p>
      </motion.div>

      <motion.div variants={staggerBottom} className="space-y-6">
         {/* Config - Priority in Mobile is usually to show the QR first if session exists, but let's keep vertical stack */}
         {qr.state.activeSession ? (
            <div className="space-y-6">
               <QRGeneratorDisplayCard qr={qr} />
               <QRGeneratorConfigCard qr={qr} />
            </div>
         ) : (
            <div className="space-y-6">
               <QRGeneratorConfigCard qr={qr} />
               <QRGeneratorDisplayCard qr={qr} />
            </div>
         )}
      </motion.div>
    </motion.div>
  );
}
