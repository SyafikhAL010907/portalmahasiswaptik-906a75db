import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Minus, Plus } from 'lucide-react';
import { useIPKSimulator } from '@/SharedLogic/hooks/useIPKSimulator';

interface IPKSimulatorListProps {
    hook: ReturnType<typeof useIPKSimulator>;
}

const staggerBottom = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function IPKSimulatorList({ hook }: IPKSimulatorListProps) {
    const { subjects, loading, simulatedGrades } = hook.state;
    const { handleSKSUpdate } = hook.actions;

    return (
        <div className="space-y-4">
            {loading ? (
                <motion.div variants={staggerBottom as any} layout={false} className="flex justify-center py-20">
                    <Loader2 className="animate-spin w-10 h-10 text-purple-500" />
                </motion.div>
            ) : subjects.length === 0 ? (
                <motion.div variants={staggerBottom as any} layout={false} className="text-center py-20 text-slate-500 dark:text-gray-500 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p>Belum ada data matkul di semester ini.</p>
                </motion.div>
            ) : (
                <motion.div variants={staggerBottom as any} layout={false} className="space-y-4">
                    {subjects.map((subject, index) => (
                        <Card key={subject.id} className="relative overflow-hidden border border-slate-200/50 dark:border-white/10 glass-card transition-all duration-500 ease-out hover:-translate-y-1 hover:shadow-2xl hover:shadow-purple-500/10 dark:hover:shadow-purple-500/20 group">
                            <CardContent className="p-4 flex flex-wrap sm:grid sm:grid-cols-[auto_1fr_auto_auto] gap-4 md:gap-6 items-center w-full">

                                {/* Col 1: Number */}
                                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold border border-blue-200 dark:border-blue-500/30">
                                    {index + 1}
                                </div>

                                {/* Col 2: Name & Code */}
                                <div className="min-w-0 flex-1 sm:flex-none">
                                    <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm md:text-base leading-tight">{subject.name}</h3>
                                    <p className="text-[10px] md:text-xs text-slate-500 dark:text-gray-500 pt-0.5">{subject.code}</p>
                                </div>

                                {/* Col 3: SKS Stepper */}
                                <div className="bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700/50 flex flex-col items-center min-w-[80px]">
                                    <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase font-bold tracking-wider mb-1">SKS</span>
                                    <div className="flex items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-0.5 shadow-sm">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleSKSUpdate(subject.id, (subject.sks || 0) - 1)}
                                            className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-purple-600 text-slate-500 dark:text-slate-400 transition-all"
                                        >
                                            <Minus className="h-2.5 w-2.5" />
                                        </Button>

                                        <Input
                                            type="number"
                                            min={0}
                                            max={24}
                                            value={subject.sks}
                                            onChange={(e) => handleSKSUpdate(subject.id, parseInt(e.target.value) || 0)}
                                            className="w-8 h-6 text-center bg-transparent border-none p-0 focus-visible:ring-0 text-slate-900 dark:text-white font-bold text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleSKSUpdate(subject.id, (subject.sks || 0) + 1)}
                                            className="h-6 w-6 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-purple-600 text-slate-500 dark:text-slate-400 transition-all"
                                        >
                                            <Plus className="h-2.5 w-2.5" />
                                        </Button>
                                    </div>
                                </div>

                                {/* Col 4: Grade Suggestion */}
                                <div className={`flex flex-col items-center justify-center min-w-[70px] p-1.5 rounded-xl border transition-all duration-300 flex-1 sm:flex-none ${simulatedGrades[subject.id] ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/20' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'}`}>
                                    <span className="text-[9px] text-slate-400 dark:text-gray-500 uppercase tracking-wider mb-0.5">Nilai</span>
                                    <span className={`text-xl font-black ${simulatedGrades[subject.id] ? 'text-purple-600 dark:text-purple-400 drop-shadow-sm' : 'text-slate-300 dark:text-slate-600'}`}>
                                        {simulatedGrades[subject.id] || "-"}
                                    </span>
                                </div>

                            </CardContent>
                        </Card>
                    ))}
                </motion.div>
            )}
        </div>
    );
}
