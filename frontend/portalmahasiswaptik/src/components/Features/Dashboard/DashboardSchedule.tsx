import { motion } from 'framer-motion';
import { Calendar, ChevronRight, Clock, MapPin, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useDashboard } from '@/SharedLogic/hooks/useDashboard';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as any
    }
  }
};

interface DashboardScheduleProps {
  dashboard: ReturnType<typeof useDashboard>;
}

export function DashboardSchedule({ dashboard }: DashboardScheduleProps) {
  const { isLoadingSchedule, schedules } = dashboard.state;
  const { getScheduleStatus } = dashboard.actions;

  return (
    <motion.div variants={staggerBottom as any} layout={false} className="glass-card rounded-2xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h2 className="text-lg font-bold flex items-center gap-2 min-w-0">
          <Calendar className="w-5 h-5 text-primary shrink-0" />
          <span className="truncate">Jadwal Hari Ini</span>
        </h2>
        <Link to="/dashboard/schedule">
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
            Lihat Semua <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </Link>
      </div>

      <div className="space-y-4">
        {isLoadingSchedule ? (
          Array(2).fill(0).map((_, i) => (
            <div key={i} className="p-4 rounded-xl border border-border/50 bg-secondary/20">
              <Skeleton className="h-6 w-1/2 mb-2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          ))
        ) : schedules.length > 0 ? (
          schedules.map((schedule) => {
            const status = getScheduleStatus(schedule.start_time, schedule.end_time);
            const isFinished = status === 'finished';
            const isOngoing = status === 'ongoing';
            const isNext = status === 'next';

            return (
              <div
                key={schedule.id}
                className={`relative p-5 rounded-xl border transition-all duration-300 ${isOngoing
                  ? 'bg-blue-500/5 border-blue-500/20 shadow-sm'
                  : isFinished
                    ? 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60 grayscale'
                    : 'bg-card/30 border-border/50 hover:bg-card/50'
                  }`}
              >
                {/* Status Badges */}
                {isOngoing && (
                  <span className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-100 dark:bg-blue-500/10 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 animate-pulse">
                    Sedang Berlangsung
                  </span>
                )}
                {isNext && (
                  <span className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-purple-600 bg-purple-100 dark:bg-purple-500/10 dark:text-purple-400 border border-purple-200 dark:border-purple-500/20">
                    Selanjutnya
                  </span>
                )}
                {isFinished && (
                  <span className="absolute top-3 right-3 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                    Selesai
                  </span>
                )}

                <div className="flex flex-col gap-2 mb-3">
                  <h3 className="font-extrabold text-xl md:text-2xl tracking-tight break-words">
                    {schedule.subjects?.name}
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-y-2.5 gap-x-4 text-sm mt-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span className="font-bold opacity-90">
                      {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-rose-500" />
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Ruang:</span>
                    <span className="font-bold">{schedule.room}</span>
                  </div>

                  <div className="flex items-center gap-2 col-span-2">
                    <User className="w-4 h-4 text-blue-500" />
                    <span className="text-slate-500 dark:text-slate-400 text-xs">Dosen:</span>
                    <span className="font-bold">
                      {schedule.profiles?.full_name || 'Belum Ditentukan'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground bg-secondary/10 rounded-xl border border-dashed border-border">
            <p>Tidak ada jadwal kuliah hari ini</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
