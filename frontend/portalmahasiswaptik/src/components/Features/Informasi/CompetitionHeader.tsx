import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCompetitions } from '@/SharedLogic/hooks/useCompetitions';

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface CompetitionHeaderProps {
  hook: ReturnType<typeof useCompetitions>;
}

export function CompetitionHeader({ hook }: CompetitionHeaderProps) {
  const { canManage } = hook.state;
  const { handleOpenDialog } = hook.actions;

  return (
    <motion.div variants={staggerTop as any} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Info Lomba</h1>
        <p className="text-muted-foreground mt-1">Kompetisi dan lomba untuk mahasiswa PTIK</p>
      </div>
      {canManage && (
        <Button onClick={() => handleOpenDialog()} className="primary-gradient shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Lomba
        </Button>
      )}
    </motion.div>
  );
}
