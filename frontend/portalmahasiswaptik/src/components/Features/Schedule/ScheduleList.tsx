import { motion } from 'framer-motion';
import { Clock, MapPin, User, Calendar, Loader2, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSchedule } from '@/SharedLogic/hooks/useSchedule';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface ScheduleListProps {
  schedule: ReturnType<typeof useSchedule>;
}

export function ScheduleList({ schedule }: ScheduleListProps) {
  const { isLoading, schedules, selectedDay, canManage } = schedule.state;
  const { getStatus, handleOpenEdit, setDeleteScheduleConfig } = schedule.actions;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing': return 'border-l-4 border-l-blue-500';
      case 'next': return 'border-l-4 border-l-violet-500';
      case 'finished': return 'border-l-4 border-l-slate-400 opacity-70';
      default: return 'border-l-4 border-l-transparent';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ongoing': return <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-bold uppercase tracking-wider animate-pulse">Berlangsung</span>;
      case 'next': return <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 border border-violet-500/20 font-bold uppercase tracking-wider">Selanjutnya</span>;
      case 'finished': return <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 font-bold uppercase tracking-wider">Selesai</span>;
      default: return null;
    }
  };

  return (
    <motion.div variants={staggerBottom as any} layout={false} className="space-y-4">
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin w-8 h-8 text-primary" /></div>
      ) : schedules.length > 0 ? (
        schedules.map((item) => {
          const status = getStatus(item.day, item.start_time, item.end_time);
          return (
            <div
              key={item.id}
              className="group rounded-2xl p-[1px] bg-transparent"
            >
              <div
                className={cn(
                  "rounded-2xl p-6 relative w-full h-full",
                  "bg-transparent border border-border/50 shadow-sm",
                  getStatusColor(status)
                )}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="font-extrabold text-xl md:text-2xl tracking-tight break-words min-w-0 flex-1">
                        {item.subjects?.name || 'Unknown Subject'}
                      </h3>
                      <div className="shrink-0 flex items-center">
                        {getStatusBadge(status)}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400 dark:text-blue-600" />
                        <span className="font-bold opacity-90">
                          {item.start_time.slice(0, 5)} - {item.end_time.slice(0, 5)} WIB
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose-400 dark:text-rose-600" />
                        <span className="opacity-70 text-xs">Ruang:</span>
                        <span className="font-bold">{item.room}</span>
                      </div>

                      <div className="flex items-center gap-2 sm:col-span-2">
                        <User className="w-4 h-4 text-blue-400 dark:text-blue-600" />
                        <span className="opacity-70 text-xs">Dosen:</span>
                        <span className="font-bold">
                          {item.profiles?.full_name || 'Dosen Belum Ditentukan'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex gap-2 self-end md:self-start transition-opacity duration-300">
                      <button className="bg-blue-500 hover:bg-blue-600 text-white rounded-lg p-2 transition-all shadow-md active:scale-95 flex items-center justify-center" onClick={() => handleOpenEdit(item)}>
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 transition-all shadow-md active:scale-95 flex items-center justify-center" onClick={() => setDeleteScheduleConfig({ isOpen: true, targetId: item.id })}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <div className="glass-card rounded-2xl p-12 text-center flex flex-col items-center">
          <Calendar className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <p className="text-muted-foreground">Tidak ada jadwal kuliah untuk hari {selectedDay}</p>
        </div>
      )}
    </motion.div>
  );
}
