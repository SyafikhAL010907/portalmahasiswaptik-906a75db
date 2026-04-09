import { Clock, MapPin, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScheduleCardProps {
  subject: string;
  time: string;
  room: string;
  lecturer: string;
  isActive?: boolean;
  isNext?: boolean;
}

export function ScheduleCard({ subject, time, room, lecturer, isActive, isNext }: ScheduleCardProps) {
  return (
    <div className={cn(
      "glass-card rounded-2xl p-5 transition-all duration-300 relative overflow-hidden",
      isActive && "border-l-4 border-l-primary glow-primary",
      isNext && "border-l-4 border-l-warning",
      !isActive && !isNext && "border-l-4 border-l-transparent"
    )}>
      {isActive && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 rounded-full bg-primary/20 text-primary text-xs font-medium animate-pulse">
            Sedang Berlangsung
          </span>
        </div>
      )}
      {isNext && !isActive && (
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 rounded-full bg-warning/30 text-warning-foreground text-xs font-medium">
            Selanjutnya
          </span>
        </div>
      )}

      <h3 className="font-semibold text-foreground text-lg mb-3 pr-24">{subject}</h3>

      <div className="space-y-2 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{time}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          <span>{room}</span>
        </div>
        <div className="flex items-center gap-2">
          <User className="w-4 h-4" />
          <span>{lecturer}</span>
        </div>
      </div>
    </div>
  );
}
