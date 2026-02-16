import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface AttendanceStats {
    percentage: number;
    semesterName: string;
    isLoading: boolean;
    error: string | null;
}

export const useAttendanceStats = (userId: string | undefined): AttendanceStats => {
    const [stats, setStats] = useState<AttendanceStats>({
        percentage: 0,
        semesterName: '...',
        isLoading: true,
        error: null,
    });

    const getCurrentSemesterRange = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();

        const startYear = 2025;
        const startMonth = 6;
        const totalMonths = (year - startYear) * 12 + (month - startMonth);
        const semesterNumber = Math.max(1, Math.floor(totalMonths / 6) + 1);

        let start, end;
        if (month >= 0 && month <= 5) {
            start = new Date(year, 0, 1).toISOString();
            end = new Date(year, 5, 30, 23, 59, 59).toISOString();
        } else {
            start = new Date(year, 6, 1).toISOString();
            end = new Date(year, 11, 31, 23, 59, 59).toISOString();
        }

        return { start, end, name: `Semester ${semesterNumber}` };
    };

    useEffect(() => {
        // If no userId, we fetch GLOBAL stats for the landing page
        const isGlobal = !userId;

        const fetchAttendance = async () => {
            try {
                setStats(prev => ({ ...prev, isLoading: true, error: null }));
                const { start, end, name } = getCurrentSemesterRange();

                console.log(`🔍 [DEBUG] ${isGlobal ? 'GLOBAL' : 'USER'} Mode - Semester Range:`, { name, start, end });
                if (!isGlobal) console.log('👤 [DEBUG] Target User ID:', userId);

                if (isGlobal) {
                    console.log('🌐 [DEBUG] Running BATCH Attendance Aggregation via RPC...');
                    const { data, error } = await (supabase as any).rpc('get_batch_attendance_stats');

                    if (error) {
                        console.error('❌ [DEBUG] Batch Attendance RPC Error:', error);
                        throw new Error(`Failed to fetch batch attendance stats: ${error.message}`);
                    }

                    if (data) {
                        console.log('✅ [DEBUG] Batch Attendance RPC Success:', data);
                        setStats({
                            percentage: data.percentage,
                            semesterName: data.semester_name,
                            isLoading: false,
                            error: null
                        });
                        return;
                    }
                }

                // User-specific fetch (requires authentication/student session)
                // Build Query - We use !inner to ensure we Only get records with a valid session
                // We also filter by status not pending
                let query = supabase
                    .from('attendance_records')
                    .select(`
                        status,
                        session_id,
                        attendance_sessions!inner (
                            created_at
                        )
                    `)
                    .neq('status', 'pending');

                // If not global, filter by specific student
                // If global, we want EVERYTHING to compute the average
                if (!isGlobal) {
                    query = query.eq('student_id', userId);
                }

                const { data: rawData, error } = await query;

                if (error) {
                    console.error('❌ [DEBUG] Supabase Attendance Query Error:', error);
                    // Handle RLS error code PGRST116 (Permission denied)
                    if (error.code === '42501' || error.code === 'PGRST116') {
                        console.warn('⚠️ [DEBUG] RLS is blocking attendance access for this user.');
                    }
                    throw new Error(`Failed to fetch user attendance records: ${error.message}`);
                }

                if (!rawData || rawData.length === 0) {
                    console.warn(`⚠️ [DEBUG] No attendance records found at all ${isGlobal ? 'globally' : 'for this user'} via Supabase query. This might be due to RLS or no data.`);
                    setStats({ percentage: 0, semesterName: name, isLoading: false, error: null });
                    return;
                }

                console.log(`📥 [DEBUG] Found ${rawData.length} total records. Filtering by date...`);

                const semesterRecords = rawData.filter(record => {
                    const sessionDate = (record.attendance_sessions as any)?.created_at;
                    if (!sessionDate) return false;
                    return sessionDate >= start && sessionDate <= end;
                });

                console.log(`📊 [DEBUG] Records in ${name}:`, semesterRecords.length);

                if (semesterRecords.length === 0) {
                    setStats({ percentage: 0, semesterName: name, isLoading: false, error: null });
                    return;
                }

                let totalHadir = 0, totalIzin = 0, totalAlpha = 0;
                semesterRecords.forEach(record => {
                    if (record.status === 'hadir') totalHadir++;
                    else if (record.status === 'izin') totalIzin++;
                    else if (record.status === 'alpha') totalAlpha++;
                });

                const totalMeetings = totalHadir + totalIzin + totalAlpha;
                let percentage = 0;
                if (totalMeetings > 0) {
                    percentage = Math.round(((totalHadir * 1) + (totalIzin * 0.5)) / totalMeetings * 100);
                }

                console.log(`🏆 [DEBUG] ${isGlobal ? 'GLOBAL' : 'USER'} Result:`, { totalHadir, totalIzin, totalAlpha, totalMeetings, percentage });

                setStats({
                    percentage,
                    semesterName: name,
                    isLoading: false,
                    error: null,
                });

            } catch (err: any) {
                console.error('❌ [DEBUG] Unexpected Error:', err);
                setStats(prev => ({ ...prev, isLoading: false, error: err.message }));
            }
        };

        fetchAttendance();

        const channel = supabase
            .channel(`attendance-stats-${userId || 'global'}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'attendance_records',
                filter: userId ? `student_id=eq.${userId}` : undefined
            }, () => fetchAttendance())
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [userId]);

    return stats;
};
