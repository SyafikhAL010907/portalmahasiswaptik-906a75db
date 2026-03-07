-- =============================================
-- Migration: Fix Missing Columns & Quota V12
-- Purpose: Add missing columns and enforce strict per-file quota
-- =============================================

-- 1. Ensure Missing Columns Exist in download_logs
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'download_logs' AND column_name = 'download_type') THEN
        ALTER TABLE public.download_logs ADD COLUMN download_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'download_logs' AND column_name = 'resource_id') THEN
        ALTER TABLE public.download_logs ADD COLUMN resource_id UUID;
    END IF;
END $$;

-- 2. Drop and Recreate Function (V12 Logic)
DROP FUNCTION IF EXISTS public.check_download_quota(uuid, text, text, uuid);

CREATE OR REPLACE FUNCTION public.check_download_quota(_user_id UUID, _type TEXT, _role TEXT, _resource_id UUID DEFAULT NULL)
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
    -- Define Quota Rules (V12)
    IF _role = 'mahasiswa' THEN
        CASE _type
            WHEN 'material' THEN
                quota_limit := 1;
                window_interval := INTERVAL '7 days';
                is_per_resource := TRUE; -- STRICT: Filter by resource_id
            ELSE
                -- Students restricted from other types
                quota_limit := 0; 
                window_interval := INTERVAL '1 second';
        END CASE;
    ELSIF _role IN ('admin_kelas', 'admin kelas') THEN
        -- Admin Kelas Rules
        CASE _type
            WHEN 'finance' THEN
                quota_limit := 2;
                window_interval := INTERVAL '7 days';
                is_per_resource := FALSE;
            WHEN 'attendance_meeting', 'attendance_master', 'material' THEN
                quota_limit := 1;
                window_interval := INTERVAL '24 hours';
                is_per_resource := FALSE;
            ELSE
                quota_limit := 5;
                window_interval := INTERVAL '1 hour';
        END CASE;
    ELSE
        -- Admin Dev / Super Admins (Full Access)
        RETURN QUERY SELECT FALSE, 999, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Count downloads in window with strict resource filtering
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

-- 3. Ensure Permissions
ALTER TABLE public.download_logs DISABLE ROW LEVEL SECURITY;
GRANT INSERT, SELECT ON public.download_logs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
