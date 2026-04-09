import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { useIPKSimulator } from '@/SharedLogic/hooks/useIPKSimulator';

interface IPKSimulatorTargetCardProps {
    hook: ReturnType<typeof useIPKSimulator>;
}

const staggerTop = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function IPKSimulatorTargetCard({ hook }: IPKSimulatorTargetCardProps) {
    const { targetIPK } = hook.state;
    const { setTargetIPK } = hook.actions;

    return (
        <motion.div variants={staggerTop as any} layout={false}>
            <Card className="glass-card sticky top-4 z-10 border-slate-200/50 dark:border-white/10">
                <CardContent className="p-6">
                    <div className="flex flex-col gap-6 items-center">
                        <div className="text-center space-y-2">
                            <label className="text-sm font-medium text-slate-500 dark:text-gray-400 uppercase tracking-widest">
                                Target IPK Saya
                            </label>
                            <div className="text-6xl font-black bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
                                {targetIPK.toFixed(2)}
                            </div>
                        </div>

                        <div className="w-full max-w-2xl px-4">
                            <input
                                type="range"
                                min="1.00"
                                max="4.00"
                                step="0.01"
                                value={targetIPK}
                                onChange={(e) => setTargetIPK(parseFloat(e.target.value))}
                                className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                            />
                            <div className="flex justify-between text-xs text-slate-400 dark:text-gray-600 mt-2 font-mono mb-2">
                                <span>1.00</span>
                                <span>2.00</span>
                                <span>3.00</span>
                                <span>4.00</span>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </motion.div>
    );
}
