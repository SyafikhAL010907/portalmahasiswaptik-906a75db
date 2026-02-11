-- Create RPC for landing page statistics (JSONB + Explicit Public Schema)
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
        'total_cash_lifetime', (SELECT COALESCE(sum(amount), 0)::numeric FROM public.transactions WHERE category = 'pemasukan'),
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

-- Grant access to all roles to ensure front-end accessibility
GRANT EXECUTE ON FUNCTION public.get_landing_stats() TO anon, authenticated, postgres, service_role;
