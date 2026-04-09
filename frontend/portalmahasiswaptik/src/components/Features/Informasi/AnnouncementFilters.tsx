import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useAnnouncements } from '@/SharedLogic/hooks/useAnnouncements';

const categories = ['Semua', 'Akademik', 'Keuangan', 'Event', 'Sistem', 'Lomba'];

const staggerTop = {
  hidden: { opacity: 0, y: -15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

interface AnnouncementFiltersProps {
  hook: ReturnType<typeof useAnnouncements>;
}

export function AnnouncementFilters({ hook }: AnnouncementFiltersProps) {
  const { selectedCategory } = hook.state;
  const { setSelectedCategory } = hook.actions;

  return (
    <motion.div variants={staggerTop as any} layout={false} className="flex gap-2 overflow-x-auto pb-2 w-full whitespace-nowrap scrollbar-hide">
      {categories.map((cat) => (
        <Button
          key={cat}
          variant={selectedCategory === cat ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setSelectedCategory(cat)}
          className={selectedCategory === cat ? 'primary-gradient transition-all flex-shrink-0' : 'text-muted-foreground flex-shrink-0'}
        >
          {cat}
        </Button>
      ))}
    </motion.div>
  );
}
