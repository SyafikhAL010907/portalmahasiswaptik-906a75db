import { useState, useEffect, useCallback } from "react";
import { motion, Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { GraduationCap, Loader2, Plus, Minus, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface Subject {
    id: string;
    name: string;
    code: string;
    semester: number;
    sks: number;
}

interface Semester {
    id: number;
    name: string;
}

// Standar Bobot Nilai Indonesia (SN-Dikti)
const GRADE_VALUES: Record<string, number> = {
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "D": 1.0,
    "E": 0.0,
};

// Descending order for calculation: A, A-, B+...
const VALUE_TO_GRADE = Object.entries(GRADE_VALUES).sort((a, b) => b[1] - a[1]);

const staggerContainer: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.12 }
    }
};
const staggerTop: Variants = {
    hidden: { opacity: 0, y: -15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};
const staggerBottom: Variants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } }
};

const IPKSimulator = () => {
    const { toast } = useToast();
    const { session } = useAuth();

    // State
    const [semester, setSemester] = useState<string>("");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [availableSemesters, setAvailableSemesters] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSemesterLoading, setIsSemesterLoading] = useState(true);

    // Initialize with a default value of 3.50
    const [targetIPK, setTargetIPK] = useState<number>(3.50);
    const [simulatedGrades, setSimulatedGrades] = useState<Record<string, string>>({});

    // Fetch Semesters on Mount
    useEffect(() => {
        const fetchSemesters = async () => {
            setIsSemesterLoading(true);
            try {
                const { data, error } = await supabase
                    .from('semesters')
                    .select('id, name')
                    .order('id');

                if (error) throw error;

                if (data && data.length > 0) {
                    // Validasi: Filter semester yang punya ID valid dan tidak kosong
                    const validData = data.filter(s => s.id !== null && s.id !== undefined && s.id.toString().trim() !== '');

                    if (validData.length > 0) {
                        setAvailableSemesters(validData);
                        // Set default semester to the first one available if not set
                        setSemester(validData[0].id.toString());
                    } else {
                        setAvailableSemesters([]);
                    }
                } else {
                    setAvailableSemesters([]);
                }
            } catch (err: any) {
                console.error("Error fetching semesters:", err);
            } finally {
                setIsSemesterLoading(false);
            }
        };
        fetchSemesters();
    }, []);

    // Fetch Subjects whenever semester changes
    useEffect(() => {
        const fetchSubjects = async () => {
            if (!semester || semester.trim() === "") return;

            setLoading(true);
            setSimulatedGrades({});

            try {
                const { data, error } = await supabase
                    .from('subjects')
                    .select('*')
                    .eq('semester', parseInt(semester))
                    .order('name');

                if (error) throw error;

                // Use real SKS from database as per requirement
                const fetchedSubjects = (data || []).map(s => ({
                    ...s,
                    sks: s.sks || 0 // Ensure SKS is at least 0
                }));

                setSubjects(fetchedSubjects);

                if (data?.length === 0) {
                    toast({
                        title: "Informasi",
                        description: `Belum ada data matkul di semester ini.`,
                    });
                }

            } catch (err: any) {
                toast({
                    title: "Gagal memuat mata kuliah",
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        };

        fetchSubjects();
    }, [semester, toast]);

    // Handle SKS Update (Local Only - Available for ALL Roles)
    const handleSKSUpdate = (id: string, newSKS: number) => {
        // Validation: Non-negative SKS only
        const validSKS = Math.max(0, newSKS);
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, sks: validSKS } : s));
    };

    // Calculation Logic (Reusable)
    const performCalculation = useCallback(() => {
        // Filter out subjects with 0 SKS from calculation to avoid skewing
        const activeSubjects = subjects.filter(s => s.sks > 0);

        if (activeSubjects.length === 0) {
            setSimulatedGrades({});
            return;
        }

        const target = targetIPK;

        // 1. Initialize all grades to A (4.0)
        let currentGrades: Record<string, number> = {};
        activeSubjects.forEach(s => currentGrades[s.id] = 4.0);

        // Helper to calc IPK
        const calcIPK = (grades: Record<string, number>) => {
            let totalSKS = 0;
            let totalPoints = 0;
            activeSubjects.forEach(s => {
                const credit = s.sks || 0;
                totalSKS += credit;
                totalPoints += credit * (grades[s.id] || 0);
            });
            return totalSKS === 0 ? 0 : totalPoints / totalSKS;
        };

        // 2. Round Robin Downgrade Algorithm
        let improvementPossible = true;
        let protectionCount = 0;
        const maxIterations = activeSubjects.length * VALUE_TO_GRADE.length * 2;

        while (improvementPossible && protectionCount < maxIterations) {
            improvementPossible = false;

            // Iterate through all subjects
            for (const sub of activeSubjects) {
                const currentVal = currentGrades[sub.id];

                // Find next lower grade
                const nextGradeEntry = VALUE_TO_GRADE.find(v => v[1] < currentVal - 0.01);
                if (!nextGradeEntry) continue; // Already at bottom (E)

                const nextVal = nextGradeEntry[1];

                // Tentative Downgrade
                const originalVal = currentGrades[sub.id];
                currentGrades[sub.id] = nextVal;

                const newIPK = calcIPK(currentGrades);

                if (newIPK >= target) {
                    // Downgrade accepted!
                    improvementPossible = true;
                    protectionCount++;
                } else {
                    // Revert, this downgrade drops us below target
                    currentGrades[sub.id] = originalVal;
                }
            }
        }

        // 3. Convert numerical values back to Letter Grades for display
        const finalGrades: Record<string, string> = {};
        for (const [id, val] of Object.entries(currentGrades)) {
            const gradeEntry = VALUE_TO_GRADE.find(v => Math.abs(v[1] - val) < 0.01);
            finalGrades[id] = gradeEntry ? gradeEntry[0] : "E";
        }

        setSimulatedGrades(finalGrades);
    }, [subjects, targetIPK]);

    // Real-Time Calculation Effect
    useEffect(() => {
        performCalculation();
    }, [performCalculation]);

    return (
        <motion.div
            className="container mx-auto p-4 space-y-6 pb-24 fade-in min-h-screen bg-slate-50 dark:bg-[#050505] transition-colors duration-300"
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            layout={false}
        >
            {/* Header */}
            <motion.div variants={staggerTop} layout={false} className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
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
                    {/* Custom Pill Styles injected into SelectTrigger */}
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

            {/* Target IPK Slider Section */}
            <motion.div variants={staggerTop} layout={false}>
                <Card className="bg-white/80 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 backdrop-blur-md sticky top-4 z-10 shadow-lg border">
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

            {/* Course List */}
            <div className="space-y-4">
                {loading ? (
                    <motion.div variants={staggerBottom} layout={false} className="flex justify-center py-20">
                        <Loader2 className="animate-spin w-10 h-10 text-purple-500" />
                    </motion.div>
                ) : subjects.length === 0 ? (
                    <motion.div variants={staggerBottom} layout={false} className="text-center py-20 text-slate-500 dark:text-gray-500 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                        <p>Belum ada data matkul di semester ini.</p>
                    </motion.div>
                ) : (
                    <motion.div variants={staggerBottom} layout={false} className="space-y-4">
                        {subjects.map((subject, index) => (
                            <Card key={subject.id} className="relative overflow-hidden border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-sm transition-all duration-300 ease-in-out hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-500/20 dark:hover:shadow-purple-500/30 hover:border-purple-300 dark:hover:border-purple-500/50 hover:bg-purple-50/50 dark:hover:bg-[#110e1b]/80 group">
                                {/* Grid Layout for Content */}
                                <CardContent className="p-4 grid grid-cols-[auto_1fr_auto_auto] gap-4 md:gap-6 items-center w-full">

                                    {/* Col 1: Number */}
                                    <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center text-sm font-bold border border-blue-200 dark:border-blue-500/30">
                                        {index + 1}
                                    </div>

                                    {/* Col 2: Name & Code */}
                                    <div className="min-w-0">
                                        <h3 className="font-semibold text-slate-900 dark:text-white truncate text-sm md:text-base leading-tight">{subject.name}</h3>
                                        <p className="text-[10px] md:text-xs text-slate-500 dark:text-gray-500 pt-0.5">{subject.code}</p>
                                    </div>

                                    {/* Col 3: SKS Stepper (Cell Style) */}
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

                                    {/* Col 4: Grade Suggestion (Cell Style) */}
                                    <div className={`flex flex-col items-center justify-center min-w-[70px] p-1.5 rounded-xl border transition-all duration-300 ${simulatedGrades[subject.id] ? 'bg-purple-50/50 dark:bg-purple-900/10 border-purple-200 dark:border-purple-500/20' : 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700/50'}`}>
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
        </motion.div>
    );
};

export default IPKSimulator;
