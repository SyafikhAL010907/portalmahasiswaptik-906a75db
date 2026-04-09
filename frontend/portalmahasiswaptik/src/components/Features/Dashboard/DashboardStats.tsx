import { motion } from 'framer-motion';
import { Wallet, Calendar, CheckCircle2, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PremiumCard } from '@/components/ui/PremiumCard';
import { formatIDR } from '@/lib/utils';
import { useDashboard } from '@/SharedLogic/hooks/useDashboard';

const staggerMiddle = {
  hidden: { opacity: 0, y: 5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as any
    }
  }
};

interface DashboardStatsProps {
  dashboard: ReturnType<typeof useDashboard>;
}

export function DashboardStats({ dashboard }: DashboardStatsProps) {
  const { 
    userRole, isLoadingSaldo, balance, schedules, isLoadingAttendance, 
    attendancePercentage, semesterName, isLoadingRank, topClass 
  } = dashboard.state;

  return (
    <motion.div variants={staggerMiddle as any} layout={false} className={`grid grid-cols-1 sm:grid-cols-2 ${userRole === 'Dosen' ? 'lg:grid-cols-3' : 'lg:grid-cols-4'} gap-4`}>
      {userRole !== 'Dosen' && (
        <PremiumCard
          icon={Wallet}
          title="Saldo Kas"
          value={isLoadingSaldo ? "..." : formatIDR(balance)}
          subtitle="Saldo Bersih Lifetime"
          gradient="from-blue-500/20 to-blue-500/5"
          iconClassName="bg-blue-500/10 text-blue-600 dark:text-blue-400"
        />
      )}
      <PremiumCard
        icon={Calendar}
        title="Jadwal Hari Ini"
        value={`${schedules.length} Matkul`}
        subtitle="Jadwal Kuliah"
        gradient="from-primary/20 to-primary/5"
        iconClassName="bg-primary/10 text-primary"
      />
      <PremiumCard
        icon={CheckCircle2}
        title="Kehadiran"
        value={isLoadingAttendance ? "..." : `${attendancePercentage}%`}
        subtitle={semesterName || "Semester Aktif"}
        gradient="from-emerald-50 to-teal-100 dark:from-emerald-900/20 dark:to-teal-900/20"
        iconClassName="bg-white/60 dark:bg-slate-800/50 text-emerald-600 dark:text-emerald-400"
      />

      {isLoadingRank ? (
        <Skeleton className="h-[120px] w-full rounded-2xl" />
      ) : topClass ? (
        <PremiumCard
          icon={Trophy}
          title={`Top: ${topClass.name}`}
          value={topClass.total.toString()}
          subtitle="Total Prestasi Kelas"
          gradient="from-yellow-500/20 to-yellow-500/5"
          iconClassName="bg-yellow-500/10 text-yellow-500"
        />
      ) : (
        <div className="glass-card p-6 rounded-2xl text-center border border-white/5 bg-card/30 flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Belum ada data prestasi</span>
        </div>
      )}
    </motion.div>
  );
}
