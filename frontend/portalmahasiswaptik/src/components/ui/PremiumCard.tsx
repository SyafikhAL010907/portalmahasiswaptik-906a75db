import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    value?: React.ReactNode;
    gradient?: string;
    onClick?: () => void;
    className?: string;
    iconClassName?: string;
    titleClassName?: string;
    variant?: 'subtle' | 'bold' | 'pastel'; // NEW: pastel for soft Finance Dashboard style
}

export function PremiumCard({
    icon: Icon,
    title,
    subtitle,
    value,
    gradient = "from-primary/20 to-primary/5",
    onClick,
    className,
    iconClassName,
    titleClassName,
    variant = 'subtle'
}: PremiumCardProps) {
    const isBold = variant === 'bold';
    const isPastel = variant === 'pastel';

    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-2xl text-left transition-all duration-300 group relative overflow-hidden",
                onClick && "cursor-pointer",
                // Pastel mode: soft bg + colored glow hover
                isPastel && "bg-gradient-to-br hover:-translate-y-1 hover:shadow-xl",
                isPastel && `${gradient}`,
                // Bold mode: full gradients
                isBold && "p-8 shadow-lg hover:scale-[1.02] hover:shadow-2xl",
                isBold && `bg-gradient-to-br ${gradient}`,
                // Subtle mode: glass effect
                !isBold && !isPastel && "glass-card p-6 hover:scale-[1.02] hover:shadow-glow",
                !isBold && !isPastel && `bg-gradient-to-br ${gradient}`,
                // Pastel padding
                isPastel && "p-6",
                className
            )}
        >
            <div className="flex items-start gap-4 h-full">
                {/* CIRCLE ICON CONTAINER for pastel mode */}
                <div className={cn(
                    "rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-all",
                    isPastel ? "w-12 h-12 rounded-full" : "w-14 h-14 shadow-sm",
                    isBold ? "bg-white/20 backdrop-blur-xl" : "bg-card/80 backdrop-blur",
                    iconClassName
                )}>
                    <Icon className={cn(
                        isPastel ? "w-6 h-6" : "w-7 h-7",
                        isBold ? "text-white" : isPastel ? "" : "text-primary"
                    )} />
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center h-full">
                    {/* PURE BLACK TEXT for pastel mode */}
                    <h3 className={cn(
                        "font-bold leading-tight",
                        isBold ? "text-xl text-white" : isPastel ? "text-lg text-slate-900 dark:text-slate-100" : "text-lg text-foreground",
                        titleClassName
                    )}>{title}</h3>
                    {value !== undefined && <div className={cn(
                        "font-black mt-1",
                        isBold ? "text-3xl text-white" : isPastel ? "text-2xl text-slate-900 dark:text-slate-100" : "text-2xl text-foreground"
                    )}>{value}</div>}
                    {subtitle && <p className={cn(
                        "text-sm font-medium mt-1",
                        isBold ? "text-white/80" : isPastel ? "text-slate-600 dark:text-slate-400" : "text-muted-foreground"
                    )}>{subtitle}</p>}
                </div>
            </div>
        </div>
    );
}
