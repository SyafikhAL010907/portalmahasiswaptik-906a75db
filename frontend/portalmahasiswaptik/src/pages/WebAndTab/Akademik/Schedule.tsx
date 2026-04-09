import { motion, Variants } from 'framer-motion';
import { useSchedule } from '@/SharedLogic/hooks/useSchedule';
import { ScheduleHeader } from '@/components/Features/Schedule/ScheduleHeader';
import { ScheduleDaySelector } from '@/components/Features/Schedule/ScheduleDaySelector';
import { ScheduleList } from '@/components/Features/Schedule/ScheduleList';
import { ScheduleModals } from '@/components/Features/Schedule/ScheduleModals';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12 }
  }
};

export default function Schedule() {
  const schedule = useSchedule();

  return (
    <motion.div
      className="space-y-6 pt-12 md:pt-0 pb-24"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      <ScheduleHeader schedule={schedule} />
      <ScheduleDaySelector schedule={schedule} />
      <ScheduleList schedule={schedule} />

      <div className="glass-card rounded-2xl p-4">
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500/30" />
            <span className="text-muted-foreground">Berlangsung</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500/30" />
            <span className="text-muted-foreground">Selanjutnya</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-slate-400/30" />
            <span className="text-muted-foreground">Selesai</span>
          </div>
        </div>
      </div>

      <ScheduleModals schedule={schedule} />
    </motion.div>
  );
}
