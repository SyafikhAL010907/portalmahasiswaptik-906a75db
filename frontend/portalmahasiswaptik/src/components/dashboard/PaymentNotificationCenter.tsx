import React, { useState, useEffect } from 'react';
import { Bell, Check, X, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';

interface PendingPayment {
    student_id: string;
    student_name: string;
    student_nim: string;
    class_name: string;
    weeks_count: number;
    week_ids: string[]; // IDs of the weekly_dues records
    total_amount: number;
}

export function PaymentNotificationCenter() {
    const { user, profile, roles } = useAuth();

    const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dismissedStudentIds, setDismissedStudentIds] = useState<Set<string>>(new Set());

    // Determine if user has access
    const isAdminDev = roles.includes('admin_dev');
    const isAdminKelas = roles.includes('admin_kelas');
    const hasAccess = isAdminDev || isAdminKelas;

    // Helper to check if role allows viewing a specific class
    const canViewClass = (className: string) => {
        if (isAdminDev) return true;
        if (isAdminKelas) {
            // Assuming profile.user_class matches the class name (e.g., 'A', 'B')
            // Or we check profile.class_id. Let's use class_name for display logic relation if needed,
            // but strict filtering should happen at data fetch or post-fetch level.
            // However, we will filter by class_id from the joined data.
            return true; // We'll filter in fetchData
        }
        return false;
    };


    const fetchData = async () => {
        if (!user || !hasAccess) return;
        setIsLoading(true);
        try {
            // STEP 1: Fetch Pending Dues
            const { data: duesData, error: duesError } = await supabase
                .from('weekly_dues')
                .select('id, amount, status, student_id, week_number')
                .eq('status', 'pending');

            if (duesError) throw duesError;

            if (!duesData || duesData.length === 0) {
                setPendingPayments([]);
                return;
            }

            // STEP 2: Extract Unique Student IDs
            const studentIds = [...new Set(duesData.map(d => d.student_id))];

            // STEP 3: Fetch Profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('user_id, full_name, nim, class_id')
                .in('user_id', studentIds);

            if (profilesError) throw profilesError;

            // STEP 4: Fetch Classes (for mapping names)
            // Optimization: We could fetch only relevant class IDs, but class table is small.
            const { data: classesData, error: classesError } = await supabase
                .from('classes')
                .select('id, name');

            if (classesError) throw classesError;

            const classMap = classesData ? Object.fromEntries(classesData.map(c => [c.id, c.name])) : {};

            // STEP 5: Manual Join & Grouping
            const grouped: Record<string, PendingPayment> = {};

            duesData.forEach((item) => {
                const studentProfile = profilesData?.find(p => p.user_id === item.student_id);
                if (!studentProfile) return; // Skip if profile not found (integrity issue, but safe to ignore in UI)

                const studentClassId = studentProfile.class_id;
                const className = classMap[studentClassId || ''] || '?';
                const studentId = item.student_id;

                // FILTER LOGIC 🛡️
                if (!isAdminDev) {
                    // Strict filter: User must be admin of the student's class
                    if (studentClassId !== profile?.class_id) {
                        return; // Skip this item
                    }
                }

                if (!grouped[studentId]) {
                    grouped[studentId] = {
                        student_id: studentId,
                        student_name: studentProfile.full_name,
                        student_nim: studentProfile.nim,
                        class_name: className,
                        weeks_count: 0,
                        week_ids: [],
                        total_amount: 0
                    };
                }

                grouped[studentId].weeks_count += 1;
                grouped[studentId].week_ids.push(item.id);
                grouped[studentId].total_amount += item.amount;
            });

            setPendingPayments(Object.values(grouped));

        } catch (err: any) {
            console.error("Manual Join Error:", err);
            toast.error(`Gagal memuat notifikasi: ${err.message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch on mount
    useEffect(() => {
        if (hasAccess) {
            fetchData();
        }
    }, [hasAccess]);

    const handleConfirm = async () => {
        if (selectedStudentIds.length === 0) return;
        setIsSubmitting(true);

        try {
            // Gather all week_ids from selected students
            const allWeekIds: string[] = [];
            selectedStudentIds.forEach(studentId => {
                const studentData = pendingPayments.find(p => p.student_id === studentId);
                if (studentData) {
                    allWeekIds.push(...studentData.week_ids);
                }
            });

            const { error } = await supabase
                .from('weekly_dues')
                .update({ status: 'paid', paid_at: new Date().toISOString() }) // Update to 'paid'
                .in('id', allWeekIds);

            if (error) throw error;

            toast.success("Pembayaran Berhasil Dikonfirmasi! 💸", {
                description: `${selectedStudentIds.length} Mahasiswa telah diperbarui menjadi Lunas.`,
                className: "bg-green-500 text-white border-green-600",
            });

            // Remove from list
            setPendingPayments(prev => prev.filter(p => !selectedStudentIds.includes(p.student_id)));
            setSelectedStudentIds([]);


        } catch (err) {
            console.error("Error confirming payments:", err);
            toast.error("Gagal mengonfirmasi pembayaran");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDismiss = (studentId: string) => {
        setDismissedStudentIds(prev => new Set(prev).add(studentId));
        // Also remove from selection if selected
        if (selectedStudentIds.includes(studentId)) {
            setSelectedStudentIds(prev => prev.filter(id => id !== studentId));
        }
    };

    const toggleSelection = (studentId: string) => {
        setSelectedStudentIds(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const toggleSelectAll = () => {
        if (selectedStudentIds.length === visiblePayments.length) {
            setSelectedStudentIds([]);
        } else {
            setSelectedStudentIds(visiblePayments.map(p => p.student_id));
        }
    };

    const visiblePayments = pendingPayments.filter(p => !dismissedStudentIds.has(p.student_id));
    const pendingCount = visiblePayments.length;

    if (!hasAccess) return null;

    return (
        <div className="bg-white dark:bg-slate-950 border-2 border-indigo-500/30 rounded-xl shadow-lg mb-6 overflow-hidden animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-4 text-white flex items-center justify-between">
                <div className="max-w-[70%]">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Bell className="w-5 h-5 flex-shrink-0" fill="currentColor" />
                        Antrean Konfirmasi Pembayaran
                    </h3>
                    <p className="text-xs text-indigo-100 opacity-90 mt-1">
                        {isAdminDev ? 'Pantau semua request pembayaran dari semua kelas.' : 'Konfirmasi pembayaran mahasiswa kelas Anda.'}
                    </p>
                </div>
                {pendingCount > 0 && (
                    <Badge className="bg-white/20 hover:bg-white/30 text-white border-none font-bold text-sm px-3 py-1 flex flex-row items-center justify-center gap-1.5 whitespace-nowrap flex-shrink-0">
                        {pendingCount} <span className="whitespace-nowrap flex-shrink-0">Pending</span>
                    </Badge>
                )}
            </div>

            {/* Content */}
            <div className="p-0">
                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p className="text-sm font-medium">Memuat data...</p>
                    </div>
                ) : visiblePayments.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-500 bg-slate-50 dark:bg-slate-900/50">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-slate-400" />
                        </div>
                        <p className="text-sm font-medium">Belum ada antrean pembayaran iuran saat ini.</p>
                    </div>
                ) : (
                    <>
                        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    checked={selectedStudentIds.length === visiblePayments.length && visiblePayments.length > 0}
                                    onCheckedChange={toggleSelectAll}
                                    id="select-all"
                                />
                                <label htmlFor="select-all" className="text-sm font-bold text-slate-600 dark:text-slate-300 cursor-pointer select-none">
                                    Pilih Semua ({visiblePayments.length})
                                </label>
                            </div>
                        </div>

                        <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[400px] overflow-y-auto">
                            {visiblePayments.map((payment) => (
                                <div key={payment.student_id} className="p-4 bg-white dark:bg-slate-950 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group">
                                    <div className="pt-1">
                                        <Checkbox
                                            checked={selectedStudentIds.includes(payment.student_id)}
                                            onCheckedChange={() => toggleSelection(payment.student_id)}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-bold text-base text-slate-800 dark:text-slate-200 truncate">
                                                {payment.student_name}
                                            </h4>
                                            {isAdminDev && (
                                                <Badge variant="outline" className="text-[10px] px-2 h-5 border-slate-200 text-slate-500 bg-slate-50">
                                                    Kelas {payment.class_name}
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-950/30 px-2 py-1 rounded-md border border-indigo-100 dark:border-indigo-900">
                                                Bayar {payment.weeks_count} Minggu
                                            </span>
                                            <span className="text-xs text-slate-400 font-mono">
                                                {payment.student_nim}
                                            </span>
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-all self-center"
                                        onClick={(e) => { e.stopPropagation(); handleDismiss(payment.student_id); }}
                                        title="Sembunyikan"
                                    >
                                        <X className="w-5 h-5" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* Footer Controls */}
            {visiblePayments.length > 0 && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
                    <span className="text-xs text-slate-400 self-center mr-auto">
                        {selectedStudentIds.length} mahasiswa dipilih
                    </span>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2 font-bold px-6 shadow-md shadow-indigo-500/20"
                        disabled={selectedStudentIds.length === 0 || isSubmitting}
                        onClick={handleConfirm}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Check className="w-4 h-4" />
                        )}
                        Konfirmasi Pembayaran
                    </Button>
                </div>
            )}
        </div>
    );
}
