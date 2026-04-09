import { motion } from 'framer-motion';
import { Trophy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeaderboard } from '@/SharedLogic/hooks/useLeaderboard';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

const getClassColor = (name: string) => {
  if (name?.includes('A')) return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
  if (name?.includes('B')) return 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20';
  if (name?.includes('C')) return 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20';
  return 'bg-secondary text-secondary-foreground';
};

interface LeaderboardStatsProps {
  hook: ReturnType<typeof useLeaderboard>;
}

export function LeaderboardStats({ hook }: LeaderboardStatsProps) {
  const stats = hook.actions.getClassStats();
  const maxScore = Math.max(...stats.map(s => s.total));

  return (
    <motion.div variants={staggerBottom as any} layout={false} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-6">
      {stats.map((stat) => (
        <div key={stat.className} className="bg-card rounded-2xl p-6 relative overflow-hidden group hover-glow-blue hover:border-primary/30 transition-all border border-border/50 shadow-sm">
          {stat.total > 0 && stat.total === maxScore && (
            <div className="absolute top-0 right-0 p-3 bg-yellow-500/10 rounded-bl-2xl">
              <Trophy className="w-6 h-6 text-yellow-500" />
            </div>
          )}
          <div className="flex flex-col items-center text-center">
            <div className={cn("w-16 h-16 rounded-2xl flex items-center justify-center mb-3 text-2xl font-bold border-2", getClassColor(stat.className))}>
              {stat.className}
            </div>
            <h3 className="text-muted-foreground font-medium">Kelas {stat.className}</h3>
            <p className="text-3xl font-bold text-foreground mt-1">{stat.total}</p>
            <span className="text-xs text-muted-foreground">Total Prestasi</span>
          </div>
        </div>
      ))}
    </motion.div>
  );
}
