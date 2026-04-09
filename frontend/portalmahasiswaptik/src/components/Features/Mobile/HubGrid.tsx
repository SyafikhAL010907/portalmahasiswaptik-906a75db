import React from 'react';
import { Link } from 'react-router-dom';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface HubItemProps {
    icon: LucideIcon;
    label: string;
    path: string;
    description: string;
    color: string;
    delay?: number;
}

export function HubItem({ icon: Icon, label, path, description, color, delay = 0 }: HubItemProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5 }}
        >
            <Link
                to={path}
                className="group flex flex-col items-center gap-4 p-6 rounded-[2.5rem] bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200/50 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 transition-all duration-300 shadow-sm hover:shadow-xl active:scale-95"
            >
                <div className={cn(
                    "w-16 h-16 rounded-[1.5rem] flex items-center justify-center text-white shadow-lg transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6",
                    color
                )}>
                    <Icon className="w-8 h-8" />
                </div>
                <div className="text-center">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">{label}</h3>
                    <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tight mt-1">{description}</p>
                </div>
            </Link>
        </motion.div>
    );
}

export function HubGrid({ children, title, subtitle }: { children: React.ReactNode, title: string, subtitle: string }) {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="px-2">
                <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                    {title}
                </h1>
                <p className="text-xs font-bold text-primary uppercase tracking-[0.3em] mt-3">
                    {subtitle}
                </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                {children}
            </div>
        </div>
    );
}
