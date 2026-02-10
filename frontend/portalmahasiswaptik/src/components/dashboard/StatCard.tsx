import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: React.ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  iconBg?: string;
  className?: string;
  valueClassName?: string;
  description?: string; // Added description prop
}

export function StatCard({ icon: Icon, label, value, trend, iconBg = 'bg-primary/10 text-primary', className, valueClassName, description }: StatCardProps) {
  return (
    <div className={cn("glass-card rounded-2xl p-6 hover:scale-[1.02] transition-transform duration-300", className)}>
      <div className="flex items-start justify-between">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", iconBg)}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={cn(
            "text-xs font-medium px-2 py-1 rounded-full",
            trend.positive ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
          )}>
            {trend.positive ? '+' : ''}{trend.value}
          </span>
        )}
      </div>
      <div className="mt-4">
        <div className={cn("text-2xl font-bold text-foreground", valueClassName)}>{value}</div>
        <div className="text-sm text-muted-foreground">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground/70 mt-1 italic">{description}</div>
        )}
      </div>
    </div>
  );
}
