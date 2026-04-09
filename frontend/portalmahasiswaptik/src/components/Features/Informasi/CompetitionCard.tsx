import { motion } from 'framer-motion';
import { Trophy, Clock, Calendar, MapPin, Users, ExternalLink, Sparkles, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Competition } from '@/SharedLogic/hooks/useCompetitions';

interface CompetitionCardProps {
    competition: Competition;
    canManage: boolean;
    onEdit: (comp: Competition) => void;
    onDelete: (comp: Competition) => void;
}

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
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

export function CompetitionCard({ competition, canManage, onEdit, onDelete }: CompetitionCardProps) {
    return (
        <motion.div
            variants={staggerBottom as any}
            layout={false}
            className={cn(
                "glass-card rounded-2xl p-4 md:p-6 transition-all duration-300 hover:shadow-glow relative overflow-hidden group",
                competition.badge === 'Hot' && "border-2 border-primary/30"
            )}
        >
            {competition.badge === 'Hot' && (
                <div className="absolute top-4 right-4">
                    <span className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                        <Sparkles className="w-3 h-3" />
                        Hot
                    </span>
                </div>
            )}
            {competition.badge === 'New' && (
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
                        <span className={cn("px-2 py-0.5 text-xs font-medium rounded-full", getCategoryColor(competition.category))}>
                            {competition.category}
                        </span>
                    </div>
                    <h3 className="font-bold text-lg text-foreground line-clamp-1">{competition.title}</h3>
                    <p className="text-sm text-muted-foreground">{competition.organizer}</p>
                </div>
            </div>

            <div className="mt-4 grid grid-cols-1 xs:grid-cols-2 gap-x-4 gap-y-2.5 text-[11px] sm:text-xs">
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <Clock className="w-3.5 h-3.5 text-destructive shrink-0" />
                    <span className="truncate">Deadline: {new Date(competition.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{competition.event_dates}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <MapPin className="w-3.5 h-3.5 text-success shrink-0" />
                    <span className="truncate">{competition.location}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground min-w-0">
                    <Users className="w-3.5 h-3.5 text-warning-foreground shrink-0" />
                    <span className="truncate">{competition.team_size}</span>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-border flex flex-row flex-wrap items-center justify-between gap-2">
                <div className="flex-shrink-0">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">Hadiah</span>
                    <p className="font-bold text-success text-sm md:text-base">{competition.prize}</p>
                </div>
                <div className="flex items-center gap-1.5 ml-auto">
                    {canManage && (
                        <div className="flex items-center gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-foreground bg-muted/20 border border-border/50"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(competition);
                                }}
                            >
                                <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:bg-destructive/10 bg-destructive/5 border border-destructive/20"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(competition);
                                }}
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                    <Button variant="pill" size="sm" asChild className="h-8 px-4 text-[11px] font-black shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all uppercase tracking-tight">
                        <a href={competition.link_url || '#'} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3 mr-1.5" />
                            Daftar
                        </a>
                    </Button>
                </div>
            </div>
        </motion.div>
    );
}
