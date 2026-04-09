import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLeaderboard } from '@/SharedLogic/hooks/useLeaderboard';

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface LeaderboardHeaderProps {
  hook: ReturnType<typeof useLeaderboard>;
}

export function LeaderboardHeader({ hook }: LeaderboardHeaderProps) {
  const { canManage } = hook.state;
  const { handleOpenDialog } = hook.actions;

  return (
    <motion.div variants={staggerTop as any} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Leaderboard Angkatan</h1>
        <p className="text-muted-foreground mt-1">Klasemen prestasi antar kelas PTIK 2025</p>
      </div>
      {canManage && (
        <Button onClick={() => handleOpenDialog()} className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-2 px-6 rounded-full shadow-md hover:shadow-lg hover:shadow-purple-500/30 transition-all duration-300 hover:-translate-y-0.5">
          <Plus className="w-4 h-4 mr-2" /> Tambah Prestasi
        </Button>
      )}
    </motion.div>
  );
}
