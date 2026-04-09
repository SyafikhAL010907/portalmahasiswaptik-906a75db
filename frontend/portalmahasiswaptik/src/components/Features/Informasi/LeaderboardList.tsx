import { motion } from 'framer-motion';
import { Award, Trophy, Pencil, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useLeaderboard } from '@/SharedLogic/hooks/useLeaderboard';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any as any } }
};

const getClassColor = (name: string) => {
  if (name?.includes('A')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  if (name?.includes('B')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  if (name?.includes('C')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  return 'bg-secondary text-secondary-foreground';
};

interface LeaderboardListProps {
  hook: ReturnType<typeof useLeaderboard>;
}

export function LeaderboardList({ hook }: LeaderboardListProps) {
  const { 
    filteredAchievements, classesList, selectedClassFilter, canManage 
  } = hook.state;
  const { handleFilterChange, handleOpenDialog, setCurrentAchievement, setIsDeleteDialogOpen, hasPermission } = hook.actions;

  return (
    <motion.div variants={staggerBottom} layout={false} className="glass-card rounded-2xl overflow-hidden">
      <div className="p-6 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Award className="w-5 h-5 text-primary" />
          Daftar Prestasi Angkatan
        </h3>

        <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 whitespace-nowrap scrollbar-hide">
          {['Semua', ...classesList.map(c => c.name)].map((filter) => (
            <Button
              key={filter}
              variant={selectedClassFilter === filter ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleFilterChange(filter)}
              className={selectedClassFilter === filter ? 'primary-gradient border-none flex-shrink-0' : 'bg-transparent border-white/10 hover:bg-white/5 flex-shrink-0'}
            >
              {filter === 'Semua' ? 'Semua' : `Kelas ${filter}`}
            </Button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/20">
            <tr>
              <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Kegiatan / Lomba</th>
              <th className="text-left py-4 px-6 font-medium text-muted-foreground text-sm">Nama Mahasiswa</th>
              <th className="text-center py-4 px-6 font-medium text-muted-foreground text-sm">Kelas</th>
              <th className="text-center py-4 px-6 font-medium text-muted-foreground text-sm">Peringkat</th>
              <th className="text-right py-4 px-6 font-medium text-muted-foreground text-sm">Tanggal</th>
              {canManage && <th className="py-4 px-6 w-20"></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {filteredAchievements.length > 0 ? filteredAchievements.map((ach) => (
              <tr key={ach.id} className="hover:bg-muted/10 transition-colors">
                <td className="py-4 px-6">
                  <p className="font-medium text-foreground">{ach.competition_name}</p>
                </td>
                <td className="py-4 px-6 text-sm text-muted-foreground">
                  {ach.student_names}
                </td>
                <td className="py-4 px-6 text-center">
                  <span className={cn("px-2.5 py-1 rounded-full text-xs font-bold", getClassColor(ach.classes?.name || ''))}>
                    {ach.classes?.name}
                  </span>
                </td>
                <td className="py-4 px-6 text-center">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                    <Trophy className="w-3 h-3" />
                    {ach.rank}
                  </span>
                </td>
                <td className="py-4 px-6 text-right text-sm text-muted-foreground whitespace-nowrap">
                  {new Date(ach.event_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                {canManage && (
                  <td className="py-4 px-6 text-right">
                    {hasPermission(ach) && (
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenDialog(ach)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                          setCurrentAchievement(ach);
                          setIsDeleteDialogOpen(true);
                        }}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={canManage ? 6 : 5} className="py-12 text-center text-muted-foreground">
                  Belum ada data prestasi untuk kategori ini
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
