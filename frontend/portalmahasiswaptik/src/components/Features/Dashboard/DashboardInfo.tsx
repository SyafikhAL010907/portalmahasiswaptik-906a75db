import { motion } from 'framer-motion';
import { ChevronRight, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AnnouncementCard } from '@/components/Features/Dashboard/AnnouncementCard';
import { useDashboard } from '@/SharedLogic/hooks/useDashboard';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface DashboardInfoProps {
  dashboard: ReturnType<typeof useDashboard>;
}

export function DashboardInfo({ dashboard }: DashboardInfoProps) {
  const { dashboardCompetitions, dashboardAnnouncements } = dashboard.state;

  return (
    <motion.div variants={staggerBottom as any} layout={false}>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold text-foreground shrink-0">Informasi Terbaru</h2>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link to="/dashboard/competitions" className="flex-1 sm:flex-initial">
            <Button variant="ghost" size="sm" className="w-full gap-1 text-[10px] sm:text-xs">Lomba <ChevronRight className="w-3 h-3" /></Button>
          </Link>
          <Link to="/dashboard/announcements" className="flex-1 sm:flex-initial">
            <Button variant="ghost" size="sm" className="w-full gap-1 text-[10px] sm:text-xs">Pengumuman <ChevronRight className="w-3 h-3" /></Button>
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {dashboardCompetitions.map((comp) => (
          <Link key={`comp-${comp.id}`} to="/dashboard/competitions">
            <AnnouncementCard
              title={comp.title}
              date={new Date(comp.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              excerpt={comp.description || 'Tidak ada deskripsi'}
              isNew={['Hot', 'New'].includes(comp.badge)}
              priority="normal"
              icon={Trophy}
            />
          </Link>
        ))}

        {dashboardAnnouncements.map((ann) => (
          <Link key={`ann-${ann.id}`} to="/dashboard/announcements">
            <AnnouncementCard
              title={ann.title}
              date={new Date(ann.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              excerpt={ann.content || ann.excerpt || 'Tidak ada konten'}
              isNew={ann.is_new}
              priority="normal"
            />
          </Link>
        ))}

        {dashboardCompetitions.length === 0 && dashboardAnnouncements.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground bg-secondary/10 rounded-xl border border-dashed border-border">
            <p>Belum ada informasi terbaru</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
