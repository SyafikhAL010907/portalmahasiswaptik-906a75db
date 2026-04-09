import { motion } from 'framer-motion';
import { Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserManagement } from '@/SharedLogic/hooks/useUserManagement';

interface UserHeaderProps {
  um: ReturnType<typeof useUserManagement>;
}

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function UserHeader({ um }: UserHeaderProps) {
  const { actions } = um;

  return (
    <motion.div variants={staggerTop} layout={false} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground truncate">
          <Users className="w-6 h-6 sm:w-7 sm:h-7 text-primary shrink-0" />
          Manajemen Pengguna
        </h1>
        <p className="text-muted-foreground mt-1 text-xs sm:text-sm truncate">Kelola akun Admin Kelas, Dosen, dan Mahasiswa</p>
      </div>

      <Button 
        onClick={() => actions.setIsCreateDialogOpen(true)}
        className="gap-2 w-full sm:w-auto sm:self-end h-9 sm:h-10 px-4 sm:px-6 rounded-xl shadow-lg hover:scale-105 transition-transform shrink-0"
      >
        <UserPlus className="w-4 h-4" /> Tambah Pengguna
      </Button>
    </motion.div>
  );
}
