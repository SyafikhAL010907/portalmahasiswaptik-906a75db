-- =============================================
-- Migration: Refine Quota Logic (Admin Kelas Material Fix)
-- Purpose: Ensure admin_kelas has per-file quota for materials (7 days)
-- =============================================

CREATE OR REPLACE FUNCTION public.check_download_quota(_user_id UUID, _type TEXT, _role TEXT, _resource_id TEXT DEFAULT NULL)
RETURNS TABLE (restricted BOOLEAN, remaining INTEGER, reset_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    quota_limit INTEGER;
    window_interval INTERVAL;
    current_count INTEGER;
    oldest_in_window TIMESTAMP WITH TIME ZONE;
    is_per_resource BOOLEAN := FALSE;
BEGIN
    -- DEBUG LOG
    RAISE NOTICE 'check_download_quota CALLED: user=% type=% role=% res=%', _user_id, _type, _role, _resource_id;

    -- Define Quota Rules (V12.2 Refined)
    IF _role = 'mahasiswa' THEN
        CASE _type
            WHEN 'material' THEN
                quota_limit := 1;
                window_interval := INTERVAL '7 days';
                is_per_resource := TRUE;
            ELSE
                quota_limit := 0; 
                window_interval := INTERVAL '1 second';
        END CASE;
    ELSIF _role IN ('admin_kelas', 'admin kelas') THEN
        CASE _type
            WHEN 'material' THEN
                -- NEW: Admin Kelas per-file material quota (7 days)
                quota_limit := 1;
                window_interval := INTERVAL '7 days';
                is_per_resource := TRUE;
            WHEN 'finance' THEN
                quota_limit := 2;
                window_interval := INTERVAL '7 days';
                is_per_resource := FALSE;
            WHEN 'attendance_meeting', 'attendance_master' THEN
                quota_limit := 1;
                window_interval := INTERVAL '24 hours';
                is_per_resource := FALSE;
            ELSE
                quota_limit := 5;
                window_interval := INTERVAL '1 hour';
        END CASE;
    ELSE
        -- Admin Dev / Super Admins
        RETURN QUERY SELECT FALSE, 999, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Count downloads
    SELECT COUNT(*), MIN(created_at) 
    INTO current_count, oldest_in_window
    FROM public.download_logs
    WHERE user_id = _user_id 
    AND download_type = _type
    AND created_at > (now() - window_interval)
    AND (NOT is_per_resource OR resource_id = _resource_id);

    IF current_count >= quota_limit THEN
        RETURN QUERY SELECT TRUE, 0, oldest_in_window + window_interval;
    ELSE
        RETURN QUERY SELECT FALSE, quota_limit - current_count, NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$;
