import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PremiumCardProps {
    icon: LucideIcon;
    title: string;
    subtitle?: string;
    value?: React.ReactNode;
    actions?: React.ReactNode; // NEW: slot for management buttons
    gradient?: string;
    onClick?: () => void;
    className?: string;
    iconClassName?: string;
    titleClassName?: string;
    subtitleClassName?: string; // NEW: flexible subtitle styling
    actionsClassName?: string; // NEW: additional styling for actions
    variant?: 'subtle' | 'bold' | 'pastel'; // NEW: pastel for soft Finance Dashboard style
    centered?: boolean;
}

export const PremiumCard = React.memo(function PremiumCard({
    icon: Icon,
    title,
    subtitle,
    value,
    actions,
    gradient = "from-primary/20 to-primary/5",
    onClick,
    className,
    iconClassName,
    titleClassName,
    subtitleClassName,
    actionsClassName,
    variant = 'subtle',
    centered = false
}: PremiumCardProps) {
    const isBold = variant === 'bold';
    const isPastel = variant === 'pastel';

    return (
        <div
            onClick={onClick}
            className={cn(
                "rounded-2xl transition-all duration-300 group relative overflow-hidden",
                !centered && "text-left",
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
            <div className={cn(
                "flex gap-4 h-full w-full",
                centered ? "flex-col items-center text-center justify-center py-2" : "flex-row items-start justify-between"
            )}>
                <div className={cn(
                    "flex flex-1 min-w-0 gap-4",
                    centered ? "flex-col items-center" : "flex-row items-center"
                )}>
                    {/* CIRCLE ICON CONTAINER for pastel mode */}
                    <div className={cn(
                        "rounded-2xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-all",
                        isPastel ? "w-12 h-12 rounded-full" : (centered ? "w-16 h-16 shadow-md" : "w-14 h-14 shadow-sm"),
                        isBold ? "bg-white/20 backdrop-blur-xl" : "bg-card/80 backdrop-blur",
                        iconClassName
                    )}>
                        <Icon className={cn(
                            isPastel ? "w-6 h-6" : (centered ? "w-8 h-8" : "w-7 h-7"),
                            isBold ? "text-white" : isPastel ? "" : "text-primary"
                        )} />
                    </div>
                    <div className={cn(
                        "min-w-0 flex flex-col h-full grow",
                        centered ? "items-center" : "justify-center"
                    )}>
                        {/* PURE BLACK TEXT for pastel mode */}
                        <h3 className={cn(
                            "font-bold leading-tight truncate", // Added truncate here
                            isBold ? "text-xl text-white" : isPastel ? "text-lg text-slate-900 dark:text-slate-100" : (centered ? "text-xl" : "text-lg text-foreground"),
                            titleClassName
                        )}>{title}</h3>
                        {value !== undefined && <div className={cn(
                            "font-black mt-1 truncate",
                            isBold ? "text-3xl text-white" : isPastel ? "text-2xl text-slate-900 dark:text-slate-100" : (centered ? "text-4xl md:text-5xl" : "text-[clamp(1rem,2.2vw,1.5rem)] text-foreground")
                        )}>{value}</div>}
                        {subtitle && <p className={cn(
                            "text-sm font-medium mt-1 max-w-[600px] truncate", // Added truncate here
                            isBold ? "text-white/80" : isPastel ? "text-slate-600 dark:text-slate-400" : "text-muted-foreground",
                            subtitleClassName
                        )}>{subtitle}</p>}
                    </div>
                </div>

                {/* ACTIONS SLOT */}
                {actions && (
                    <div className={cn("flex-shrink-0 flex items-center justify-end z-20", actionsClassName)}>
                        {actions}
                    </div>
                )}
            </div>
        </div>
    );
});
