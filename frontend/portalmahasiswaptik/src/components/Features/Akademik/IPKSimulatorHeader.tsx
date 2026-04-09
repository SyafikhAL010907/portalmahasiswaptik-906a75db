import { motion } from 'framer-motion';
import { GraduationCap, ChevronDown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIPKSimulator } from '@/SharedLogic/hooks/useIPKSimulator';

interface IPKSimulatorHeaderProps {
    hook: ReturnType<typeof useIPKSimulator>;
}

const staggerTop = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

export function IPKSimulatorHeader({ hook }: IPKSimulatorHeaderProps) {
    const { semester, availableSemesters, isSemesterLoading } = hook.state;
    const { setSemester } = hook.actions;

    return (
        <motion.div variants={staggerTop as any} layout={false} className="flex flex-row flex-wrap items-center justify-between gap-4 mb-6">
            <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 dark:from-purple-400 dark:to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
                    <GraduationCap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                    IPK Simulator
                </h1>
                <p className="text-slate-600 dark:text-gray-400 mt-1">
                    Geser slider untuk melihat saran nilai secara real-time.
                </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto relative">
                <div className="w-full md:w-56">
                    <Select value={semester} onValueChange={setSemester}>
                        <SelectTrigger className="w-full h-auto bg-white/80 dark:bg-slate-800/80 backdrop-blur-md border-2 border-slate-200 dark:border-slate-700 hover:border-purple-400 dark:hover:border-purple-500 text-slate-800 dark:text-white rounded-2xl px-6 py-2.5 font-bold shadow-sm transition-all focus:ring-4 focus:ring-purple-500/20 cursor-pointer [&>svg]:hidden">
                            <SelectValue placeholder="Pilih Semester" />
                            <ChevronDown className="absolute right-4 w-5 h-5 opacity-70" />
                        </SelectTrigger>
                        <SelectContent className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl shadow-xl">
                            {isSemesterLoading ? (
                                <SelectItem value="loading" disabled className="text-muted-foreground py-2 italic text-center">
                                    Memuat semester...
                                </SelectItem>
                            ) : availableSemesters.length > 0 ? (
                                availableSemesters.map((sem) => (
                                    <SelectItem
                                        key={sem.id}
                                        value={sem.id.toString()}
                                        className="focus:bg-purple-50 dark:focus:bg-slate-800 focus:text-purple-900 dark:focus:text-purple-100 cursor-pointer font-medium py-2"
                                    >
                                        {sem.name}
                                    </SelectItem>
                                ))
                            ) : (
                                <SelectItem value="none" disabled className="text-muted-foreground py-2 italic text-center">
                                    Belum ada data
                                </SelectItem>
                            )}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </motion.div>
    );
}
