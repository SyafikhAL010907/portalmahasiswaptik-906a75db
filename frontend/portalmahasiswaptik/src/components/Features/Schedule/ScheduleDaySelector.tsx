import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSchedule } from '@/SharedLogic/hooks/useSchedule';

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface ScheduleDaySelectorProps {
  schedule: ReturnType<typeof useSchedule>;
}

export function ScheduleDaySelector({ schedule }: ScheduleDaySelectorProps) {
  const { selectedDay, currentDayIndex, days } = schedule.state;
  const { setSelectedDay, goToPrevDay, goToNextDay } = schedule.actions;

  return (
    <motion.div variants={staggerTop as any} layout={false} className="glass-card rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={goToPrevDay} disabled={currentDayIndex === 0}>
          <ChevronLeft className="w-5 h-5" />
        </Button>

        <div className="flex gap-2 overflow-x-auto px-4 scrollbar-hide">
          {days.map((day) => (
            <Button
              key={day}
              variant={selectedDay === day ? 'default' : 'ghost'}
              onClick={() => setSelectedDay(day)}
              className={`min-w-[80px] ${selectedDay === day ? 'primary-gradient' : ''}`}
            >
              {day}
            </Button>
          ))}
        </div>

        <Button variant="ghost" size="icon" onClick={goToNextDay} disabled={currentDayIndex === days.length - 1}>
          <ChevronRight className="w-5 h-5" />
        </Button>
      </div>
    </motion.div>
  );
}
