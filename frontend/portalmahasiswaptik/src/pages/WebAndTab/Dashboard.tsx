import { motion, Variants } from 'framer-motion';
import { Sun, Cloud } from 'lucide-react';
import { useDashboard } from '@/SharedLogic/hooks/useDashboard';
import { DashboardStats } from '@/components/Features/Dashboard/DashboardStats';
import { DashboardSchedule } from '@/components/Features/Dashboard/DashboardSchedule';
import { DashboardInfo } from '@/components/Features/Dashboard/DashboardInfo';
import { DashboardDigitalCard } from '@/components/Features/Dashboard/DashboardDigitalCard';
import { DashboardQuickActions } from '@/components/Features/Dashboard/DashboardQuickActions';
import { DashboardModals } from '@/components/Features/Dashboard/DashboardModals';

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12
    }
  }
};

const staggerTop: Variants = {
  hidden: { opacity: 0, y: -15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      ease: [0.16, 1, 0.3, 1] as any as any
    }
  }
};

export default function Dashboard() {
  const dashboard = useDashboard();
  const { greeting, userName, userRole, userClass, weather } = dashboard.state;

  return (
    <motion.div
      className="space-y-6 pt-12 md:pt-0 pb-24"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      layout={false}
    >
      <motion.div variants={staggerTop} layout={false} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {greeting}, <span className="text-primary">{userName || '...'}</span>! 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            {userRole} {userClass ? `Kelas ${userClass}` : ''} • {new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex items-center gap-3 glass-card rounded-2xl px-4 py-3 w-full md:w-auto mt-2 md:mt-0">
          {weather?.condition === 'Hujan' || weather?.condition === 'Badai' ? (
            <Cloud className="w-6 h-6 text-gray-400" />
          ) : weather?.condition === 'Berawan' || weather?.condition === 'Berkabut' ? (
            <Cloud className="w-6 h-6 text-gray-400" />
          ) : (
            <Sun className="w-6 h-6 text-warning" />
          )}
          <div>
            <div className="text-sm font-medium text-foreground">{weather ? `${weather.temp}°C` : '...'}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              {weather ? weather.condition : 'Memuat...'}
            </div>
            {weather && <div className="text-[10px] text-muted-foreground/60">{weather.location}</div>}
          </div>
        </div>
      </motion.div>

      <DashboardStats dashboard={dashboard} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6 order-2 lg:order-1">
          <DashboardSchedule dashboard={dashboard} />
          <DashboardInfo dashboard={dashboard} />
        </div>

        <div className="space-y-6 order-1 lg:order-2">
          <DashboardDigitalCard dashboard={dashboard} />
          <DashboardQuickActions dashboard={dashboard} />
        </div>
      </div>

      <DashboardModals dashboard={dashboard} />
    </motion.div>
  );
}
