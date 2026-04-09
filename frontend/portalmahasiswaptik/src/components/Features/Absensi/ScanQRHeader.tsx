import { motion } from 'framer-motion';
import { QrCode } from 'lucide-react';

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any as any } }
};

export function ScanQRHeader() {
  return (
    <motion.div variants={staggerTop} layout={false}>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <QrCode className="w-7 h-7 text-primary" />
        Scan QR Absensi
      </h1>
      <p className="text-muted-foreground mt-1">
        Scan QR Code dari dosen untuk mencatat kehadiran
      </p>
    </motion.div>
  );
}
