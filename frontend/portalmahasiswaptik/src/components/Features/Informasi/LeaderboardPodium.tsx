import { motion } from 'framer-motion';
import { Trophy, Medal, Star, Crown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ClassStat } from '@/SharedLogic/hooks/useLeaderboard';

interface LeaderboardPodiumProps {
    stats: ClassStat[];
}

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function LeaderboardPodium({ stats }: LeaderboardPodiumProps) {
    const sortedStats = [...stats].sort((a, b) => b.total - a.total);

    if (sortedStats.length < 2) return null;

    return (
        <motion.div variants={staggerBottom as any} layout={false} className="glass-card rounded-3xl p-4 md:p-8 flex flex-col items-center justify-center overflow-x-auto md:overflow-hidden relative scrollbar-none">
            <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
            <h2 className="text-lg md:text-xl font-bold mb-8 md:mb-12 flex items-center gap-2 relative z-10 text-foreground">
                <TrendingUp className="w-5 h-5 text-primary" />
                Peringkat Kelas
            </h2>

            <div className="flex flex-row items-end justify-center gap-1 md:gap-3 lg:gap-6 relative z-10 pb-4 min-h-[260px] md:min-h-[320px] lg:min-h-[400px] w-full">

                {/* 5th Place (Addition for Kelas E) */}
                {sortedStats[4] && (
                    <div className="flex flex-col items-center justify-end h-full group transition-all duration-300 hover:-translate-y-1 order-0 flex-1 opacity-80">
                        <span className="font-bold text-slate-500 dark:text-slate-400 text-[9px] md:text-sm mb-6 md:mb-8 text-center leading-tight">
                            Kelas<br />{sortedStats[4].className}
                        </span>
                        <div className={cn(
                            "w-full md:w-20 lg:w-24 h-10 md:h-12 lg:h-16 bg-gradient-to-t from-slate-400/20 to-slate-400/5 rounded-t-lg border-t border-x border-slate-400/20 flex items-center justify-center relative shadow-sm"
                        )}>
                            <span className="text-lg md:text-2xl lg:text-3xl font-bold text-slate-500 opacity-20">5</span>
                            <div className="absolute -top-3 md:-top-5 lg:-top-6 transition-transform group-hover:scale-110 duration-300">
                                <Star className="w-5 h-5 md:w-8 md:h-8 lg:w-10 lg:h-10 text-slate-500/50" />
                            </div>
                        </div>
                        <span className="font-mono text-[8px] md:text-sm text-muted-foreground mt-2">{sortedStats[4].total} Poin</span>
                    </div>
                )}

                {/* 2nd Place */}
                {sortedStats[1] && (
                    <div className="flex flex-col items-center justify-end h-full group transition-all duration-300 hover:-translate-y-1 order-1 flex-1">
                        <span className="font-bold text-foreground text-[10px] md:text-lg mb-10 md:mb-12 text-center leading-tight">
                            Kelas<br />{sortedStats[1].className}
                        </span>
                        <div className={cn(
                            "w-full md:w-24 lg:w-28 h-28 md:h-32 lg:h-36 bg-gradient-to-t from-gray-400/30 to-gray-400/5 rounded-t-lg border-t border-x border-gray-400/30 flex items-center justify-center relative",
                            "shadow-[0_0_40px_-5px_rgba(148,163,184,0.3)]"
                        )}>
                            <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-gray-400 opacity-20">2</span>
                            <div className="absolute -top-6 md:-top-8 lg:-top-10 transition-transform group-hover:scale-110 duration-300">
                                <Medal className="w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14 text-gray-400 drop-shadow-lg" />
                            </div>
                        </div>
                        <span className="font-mono text-[9px] md:text-base text-muted-foreground mt-2">{sortedStats[1].total} Poin</span>
                    </div>
                )}

                {/* 1st Place */}
                {sortedStats[0] && (
                    <div className="flex flex-col items-center justify-end h-full z-20 group transition-all duration-300 hover:-translate-y-2 order-2 flex-1">
                        <div className="animate-bounce-slow mb-1">
                            <Crown className="w-7 h-7 md:w-12 md:h-12 text-yellow-500" />
                        </div>
                        <span className="font-bold text-[11px] md:text-2xl text-yellow-500 mb-12 md:mb-16 drop-shadow-sm text-center leading-tight">
                            Kelas<br />{sortedStats[0].className}
                        </span>
                        <div className={cn(
                            "w-full md:w-30 lg:w-36 h-36 md:h-42 lg:h-48 bg-gradient-to-t from-yellow-500/30 to-yellow-500/5 rounded-t-lg border-t border-x border-yellow-500/30 flex items-center justify-center relative",
                            "shadow-[0_0_50px_-10px_rgba(234,179,8,0.5)]"
                        )}>
                            <span className="text-4xl md:text-6xl lg:text-7xl font-bold text-yellow-500 opacity-20">1</span>
                            <div className="absolute -top-8 md:-top-10 lg:-top-12 transition-transform group-hover:scale-110 duration-300">
                                <Trophy className="w-10 h-10 md:w-16 md:h-16 lg:w-20 lg:h-20 text-yellow-500 [filter:drop-shadow(0_0_10px_rgba(234,179,8,0.4))]" />
                            </div>
                        </div>
                        <span className="font-mono text-[10px] md:text-base font-bold text-yellow-500 mt-2">{sortedStats[0].total} Poin</span>
                    </div>
                )}

                {/* 3rd Place */}
                {sortedStats[2] && (
                    <div className="flex flex-col items-center justify-end h-full group transition-all duration-300 hover:-translate-y-1 order-3 flex-1">
                        <span className="font-bold text-foreground text-[10px] md:text-lg mb-10 md:mb-12 text-center leading-tight">
                            Kelas<br />{sortedStats[2].className}
                        </span>
                        <div className={cn(
                            "w-full md:w-24 lg:w-28 h-20 md:h-24 lg:h-28 bg-gradient-to-t from-amber-700/30 to-amber-700/5 rounded-t-lg border-t border-x border-amber-700/30 flex items-center justify-center relative",
                            "shadow-[0_0_40px_-5px_rgba(180,83,9,0.3)]"
                        )}>
                            <span className="text-2xl md:text-3xl lg:text-4xl font-bold text-amber-700 opacity-20">3</span>
                            <div className="absolute -top-6 md:-top-8 lg:-top-10 transition-transform group-hover:scale-110 duration-300">
                                <Medal className="w-8 h-8 md:w-12 md:h-12 lg:w-14 lg:h-14 text-amber-700 drop-shadow-lg" />
                            </div>
                        </div>
                        <span className="font-mono text-[9px] md:text-base text-muted-foreground mt-2">{sortedStats[2].total} Poin</span>
                    </div>
                )}

                {/* 4th Place */}
                {sortedStats[3] && (
                    <div className="flex flex-col items-center justify-end h-full group transition-all duration-300 hover:-translate-y-1 order-4 flex-1">
                        <span className="font-bold text-slate-500 dark:text-slate-400 text-[10px] md:text-lg mb-8 md:mb-10 text-center leading-tight">
                            Kelas<br />{sortedStats[3].className}
                        </span>
                        <div className={cn(
                            "w-full md:w-24 lg:w-28 h-12 md:h-16 lg:h-20 bg-gradient-to-t from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700/80 rounded-t-lg border-t border-x border-slate-300/30 flex items-center justify-center relative shadow-sm"
                        )}>
                            <span className="text-xl md:text-3xl lg:text-4xl font-bold text-slate-400 opacity-20">4</span>
                            <div className="absolute -top-4 md:-top-6 lg:-top-8 transition-transform group-hover:scale-110 duration-300">
                                <Star className="w-6 h-6 md:w-10 md:h-10 lg:w-12 lg:h-12 text-slate-400 dark:text-slate-500 fill-slate-300" />
                            </div>
                        </div>
                        <span className="font-mono text-[9px] md:text-base text-slate-500 mt-2">{sortedStats[3].total} Poin</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
