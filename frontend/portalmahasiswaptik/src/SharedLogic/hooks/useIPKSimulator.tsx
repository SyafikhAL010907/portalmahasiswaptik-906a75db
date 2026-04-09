import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/components/ui/use-toast";

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

const VALUE_TO_GRADE = Object.entries(GRADE_VALUES).sort((a, b) => b[1] - a[1]);

export function useIPKSimulator() {
    const { toast } = useToast();

    // State
    const [semester, setSemester] = useState<string>("");
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [availableSemesters, setAvailableSemesters] = useState<Semester[]>([]);
    const [loading, setLoading] = useState(false);
    const [isSemesterLoading, setIsSemesterLoading] = useState(true);

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
                    const validData = data.filter(s => s.id !== null && s.id !== undefined && s.id.toString().trim() !== '');
                    if (validData.length > 0) {
                        setAvailableSemesters(validData);
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

                const fetchedSubjects = (data || []).map(s => ({
                    ...s,
                    sks: s.sks || 0
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

    const handleSKSUpdate = (id: string, newSKS: number) => {
        const validSKS = Math.max(0, newSKS);
        setSubjects(prev => prev.map(s => s.id === id ? { ...s, sks: validSKS } : s));
    };

    const performCalculation = useCallback(() => {
        const activeSubjects = subjects.filter(s => s.sks > 0);

        if (activeSubjects.length === 0) {
            setSimulatedGrades({});
            return;
        }

        const target = targetIPK;

        let currentGrades: Record<string, number> = {};
        activeSubjects.forEach(s => currentGrades[s.id] = 4.0);

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

        let improvementPossible = true;
        let protectionCount = 0;
        const maxIterations = activeSubjects.length * VALUE_TO_GRADE.length * 2;

        while (improvementPossible && protectionCount < maxIterations) {
            improvementPossible = false;

            for (const sub of activeSubjects) {
                const currentVal = currentGrades[sub.id];
                const nextGradeEntry = VALUE_TO_GRADE.find(v => v[1] < currentVal - 0.01);
                if (!nextGradeEntry) continue;

                const nextVal = nextGradeEntry[1];
                const originalVal = currentGrades[sub.id];
                currentGrades[sub.id] = nextVal;

                const newIPK = calcIPK(currentGrades);

                if (newIPK >= target) {
                    improvementPossible = true;
                    protectionCount++;
                } else {
                    currentGrades[sub.id] = originalVal;
                }
            }
        }

        const finalGrades: Record<string, string> = {};
        for (const [id, val] of Object.entries(currentGrades)) {
            const gradeEntry = VALUE_TO_GRADE.find(v => Math.abs(v[1] - val) < 0.01);
            finalGrades[id] = gradeEntry ? gradeEntry[0] : "E";
        }

        setSimulatedGrades(finalGrades);
    }, [subjects, targetIPK]);

    useEffect(() => {
        performCalculation();
    }, [performCalculation]);

    return {
        state: {
            semester, subjects, availableSemesters, loading, isSemesterLoading,
            targetIPK, simulatedGrades
        },
        actions: {
            setSemester, setTargetIPK, handleSKSUpdate, performCalculation
        }
    };
}
