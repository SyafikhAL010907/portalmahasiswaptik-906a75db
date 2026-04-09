import { motion } from 'framer-motion';
import { Trophy, Clock, Calendar, MapPin, Users, Sparkles, Pencil, Trash2, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useCompetitions } from '@/SharedLogic/hooks/useCompetitions';

const staggerBottom = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any as any } }
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'Hackathon': 'bg-primary/10 text-primary',
    'Design': 'bg-success/10 text-success',
    'Data Science': 'bg-warning/10 text-warning-foreground',
    'Programming': 'bg-destructive/10 text-destructive',
    'Startup': 'bg-accent text-accent-foreground',
    'Security': 'bg-muted text-muted-foreground',
  };
  return colors[category] || 'bg-muted text-muted-foreground';
};

interface CompetitionListProps {
  hook: ReturnType<typeof useCompetitions>;
}

export function CompetitionList({ hook }: CompetitionListProps) {
  const { loading, filteredCompetitions, canManage } = hook.state;
  const { handleOpenDialog, setCurrentCompetition, setIsDeleteDialogOpen } = hook.actions;

  if (loading) {
    return (
      <motion.div variants={staggerBottom} layout={false} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-64 rounded-2xl bg-secondary/20 animate-pulse" />
        ))}
      </motion.div>
    );
  }

  return (
    <motion.div variants={staggerBottom} layout={false} className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {filteredCompetitions.length > 0 ? (
        filteredCompetitions.map((comp) => (
          <div
            key={comp.id}
            className={cn(
              "glass-card rounded-2xl p-6 transition-all duration-300 hover:shadow-glow relative overflow-hidden group",
              comp.badge === 'Hot' && "border-2 border-primary/30"
            )}
          >
            {comp.badge === 'Hot' && (
              <div className="absolute top-4 right-4">
                <span className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Hot
                </span>
              </div>
            )}
            {comp.badge === 'New' && (
              <div className="absolute top-4 right-4">
                <span className="flex items-center gap-1 px-3 py-1 bg-indigo-500 text-white text-xs font-medium rounded-full">
                  <Sparkles className="w-3 h-3" />
                  New
                </span>
              </div>
            )}

            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-success/20 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-16">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", getCategoryColor(comp.category))}>
                    {comp.category}
                  </span>
                </div>
                <h3 className="font-bold text-lg text-foreground line-clamp-1">{comp.title}</h3>
                <p className="text-sm text-muted-foreground">{comp.organizer}</p>
              </div>
            </div>

            <p className="mt-4 text-sm text-foreground/80 line-clamp-2 min-h-[3rem]">{comp.description}</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 text-destructive" />
                <span className="truncate">Deadline: {new Date(comp.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 text-primary" />
                <span className="truncate">{comp.event_dates}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 text-success" />
                <span className="truncate">{comp.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4 text-warning-foreground" />
                <span className="truncate">{comp.team_size}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex items-center justify-between">
              <div>
                <span className="text-xs text-muted-foreground">Hadiah</span>
                <p className="font-bold text-success truncate max-w-[120px]">{comp.prize}</p>
              </div>
              <div className="flex gap-2">
                {canManage && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDialog(comp);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrentCompetition(comp);
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
                <Button variant="pill" size="sm" asChild className="h-8">
                  <a href={comp.link_url || '#'} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Daftar
                  </a>
                </Button>
              </div>
            </div>
          </div>
        ))
      ) : (
        <div className="col-span-full text-center py-12 text-muted-foreground bg-secondary/5 rounded-3xl border border-dashed border-border">
          <Trophy className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p>Belum ada lomba untuk kategori ini</p>
        </div>
      )}
    </motion.div>
  );
}
