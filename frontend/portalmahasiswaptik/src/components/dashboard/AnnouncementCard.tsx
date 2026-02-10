import { Megaphone, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AnnouncementCardProps {
  title: string;
  date: string;
  excerpt: string;
  isNew?: boolean;
  priority?: 'normal' | 'important' | 'urgent';
  icon?: LucideIcon;
}

export function AnnouncementCard({ title, date, excerpt, isNew, priority = 'normal', icon: Icon = Megaphone }: AnnouncementCardProps) {
  const priorityStyles = {
    normal: {
      bg: 'bg-card',
      border: 'border-border/50',
      iconBg: 'bg-primary/10',
      iconText: 'text-primary',
      hoverShadow: 'hover:shadow-primary/20',
      hoverBorder: 'hover:border-primary/30',
      textAccent: 'group-hover:text-primary'
    },
    important: {
      bg: 'bg-amber-50 dark:bg-amber-900/10',
      border: 'border-amber-200/50 dark:border-amber-900/30',
      iconBg: 'bg-amber-500/20',
      iconText: 'text-amber-600',
      hoverShadow: 'hover:shadow-amber-500/20',
      hoverBorder: 'hover:border-amber-500/30',
      textAccent: 'group-hover:text-amber-600'
    },
    urgent: {
      bg: 'bg-indigo-50 dark:bg-indigo-900/10',
      border: 'border-indigo-200/50 dark:border-indigo-900/30',
      iconBg: 'bg-indigo-500/20',
      iconText: 'text-indigo-600',
      hoverShadow: 'hover:shadow-indigo-500/20',
      hoverBorder: 'hover:border-indigo-500/30',
      textAccent: 'group-hover:text-indigo-600'
    }
  };

  const style = priorityStyles[priority];

  return (
    <div className={cn(
      "rounded-2xl p-5 transition-all duration-300 cursor-pointer group border shadow-sm",
      "hover:scale-[1.01] hover:-translate-y-1 hover:shadow-xl",
      style.bg,
      style.border,
      style.hoverShadow,
      style.hoverBorder,
      "relative overflow-hidden"
    )}>
      <div className="flex items-start justify-between gap-4 relative z-10">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors", style.iconBg, style.iconText)}>
              <Icon className="w-4 h-4" />
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none">{date}</span>
              {isNew && (
                <span className="w-fit mt-1 px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-black uppercase tracking-tighter border border-blue-500/20">
                  New
                </span>
              )}
            </div>
          </div>

          <h3 className={cn("font-bold text-foreground mb-1 transition-colors line-clamp-1", style.textAccent)}>{title}</h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{excerpt}</p>
        </div>
        <ChevronRight className={cn("w-5 h-5 text-muted-foreground/50 transition-all mt-1 group-hover:translate-x-1", style.textAccent)} />
      </div>
    </div>
  );
}
