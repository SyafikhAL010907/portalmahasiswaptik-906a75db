import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCompetitions } from '@/SharedLogic/hooks/useCompetitions';

const categories = ['Semua', 'Hackathon', 'Design', 'Data Science', 'Programming', 'Startup', 'Security'];

interface CompetitionFiltersProps {
  hook: ReturnType<typeof useCompetitions>;
}

export function CompetitionFilters({ hook }: CompetitionFiltersProps) {
  const { selectedCategory } = hook.state;
  const { setSelectedCategory } = hook.actions;

  return (
    <div className="flex gap-2 pb-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
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
    </div>
  );
}
