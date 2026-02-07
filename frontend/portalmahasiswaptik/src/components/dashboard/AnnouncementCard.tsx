import { Megaphone, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnouncementCardProps {
  title: string;
  date: string;
  excerpt: string;
  isNew?: boolean;
  priority?: 'normal' | 'important' | 'urgent';
}

export function AnnouncementCard({ title, date, excerpt, isNew, priority = 'normal' }: AnnouncementCardProps) {
  const priorityStyles = {
    normal: 'bg-card',
    important: 'bg-warning/10 border-warning/30',
    urgent: 'bg-destructive/10 border-destructive/30',
  };

  return (
    <div className={cn(
      "glass-card rounded-2xl p-5 hover:scale-[1.01] transition-transform duration-300 cursor-pointer group",
      priorityStyles[priority]
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className={cn(
              "w-4 h-4",
              priority === 'urgent' ? 'text-destructive' : priority === 'important' ? 'text-warning-foreground' : 'text-primary'
            )} />
            <span className="text-xs text-muted-foreground">{date}</span>
            {isNew && (
              <span className="px-2 py-0.5 rounded-full bg-primary text-primary-foreground text-xs font-medium">
                New
              </span>
            )}
          </div>
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{excerpt}</p>
        </div>
        <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );
}
