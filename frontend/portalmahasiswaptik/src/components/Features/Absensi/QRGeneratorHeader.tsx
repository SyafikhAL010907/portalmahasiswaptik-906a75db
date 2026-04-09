import { motion } from 'framer-motion';
import { QrCode } from 'lucide-react';

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function QRGeneratorHeader() {
  return (
    <motion.div variants={staggerTop as any} layout={false}>
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <QrCode className="w-7 h-7 text-primary" />
        Generator QR Absensi
      </h1>
      <p className="text-muted-foreground mt-1">
        Buat QR Code untuk sesi perkuliahan
      </p>
    </motion.div>
  );
}
