import { motion, Variants } from 'framer-motion';
import { useAttendance } from '@/SharedLogic/hooks/useAttendance';
import { AttendanceHeader } from '@/components/Features/Absensi/AttendanceHeader';
import { AttendanceViews } from '@/components/Features/Absensi/AttendanceViews';
import { AttendanceStudents } from '@/components/Features/Absensi/AttendanceStudents';
import { AttendanceModals } from '@/components/Features/Absensi/AttendanceModals';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

export default function AttendanceHistory() {
  const at = useAttendance();
  const { view } = at.state;

  return (
    <motion.div
      className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-12 md:pt-0 pb-10"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      <AttendanceHeader at={at} />
      
      {view === 'students' ? (
        <AttendanceStudents at={at} />
      ) : (
        <AttendanceViews at={at} />
      )}

      <AttendanceModals at={at} />
    </motion.div>
  );
}
