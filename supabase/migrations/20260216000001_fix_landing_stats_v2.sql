-- 1. Create get_batch_attendance_stats RPC (SECURITY DEFINER to bypass RLS for Batch average)
CREATE OR REPLACE FUNCTION public.get_batch_attendance_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    total_hadir int;
    total_izin int;
    total_alpha int;
    total_meetings int;
    percentage int;
BEGIN
    -- Join with sessions -> meetings -> subjects to filter by Semester 2
    SELECT 
        count(*) FILTER (WHERE ar.status = 'hadir'),
        count(*) FILTER (WHERE ar.status = 'izin'),
        count(*) FILTER (WHERE ar.status = 'alpha')
    INTO total_hadir, total_izin, total_alpha
    FROM public.attendance_records ar
    JOIN public.attendance_sessions s ON ar.session_id = s.id
    JOIN public.meetings m ON s.meeting_id = m.id
    JOIN public.subjects sub ON m.subject_id = sub.id
    WHERE ar.status != 'pending'
    AND sub.semester = 2;

    total_meetings := total_hadir + total_izin + total_alpha;
    
    IF total_meetings > 0 THEN
        percentage := round(((total_hadir * 1.0) + (total_izin * 0.5)) / total_meetings * 100);
    ELSE
        percentage := 0;
    END IF;

    RETURN jsonb_build_object(
        'percentage', percentage,
        'semester_name', 'Semester 2'
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_batch_attendance_stats() TO anon, authenticated, postgres, service_role;

-- 2. Update get_landing_stats RPC to fix finance calculation (Target: 1.035.000)
CREATE OR REPLACE FUNCTION public.get_landing_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result jsonb;
BEGIN
    SELECT jsonb_build_object(
        'total_students', (
            SELECT count(DISTINCT p.id)::int
            FROM public.profiles p
            JOIN public.user_roles ur ON p.user_id = ur.user_id
            WHERE ur.role IN ('mahasiswa', 'admin_kelas')
        ),
        'total_classes', (SELECT count(*)::int FROM public.classes),
        'total_subjects', (SELECT count(*)::int FROM public.subjects WHERE semester = 2),
        'total_cash_lifetime', (
            (SELECT count(*)::numeric * 5000 FROM public.weekly_dues WHERE status = 'paid') +
            (SELECT COALESCE(sum(amount), 0)::numeric FROM public.transactions WHERE type = 'income') -
            (SELECT COALESCE(sum(amount), 0)::numeric FROM public.transactions WHERE type = 'expense')
        ),
        'class_breakdown', (
            SELECT COALESCE(jsonb_agg(jsonb_build_object('name', c.name, 'count', (
                SELECT count(DISTINCT p.id)::int
                FROM public.profiles p
                JOIN public.user_roles ur ON p.user_id = ur.user_id
                WHERE p.class_id = c.id AND ur.role IN ('mahasiswa', 'admin_kelas')
            )) ORDER BY c.name), '[]'::jsonb)
            FROM public.classes c
        )
    ) INTO result;
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated, postgres, service_role;
