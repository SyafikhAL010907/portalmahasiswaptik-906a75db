-- =============================================
-- Migration: Quota Logic V11 & Permissions Fix
-- Purpose: Implement specific limits for Mahasiswa, Finance & Attendance/Repo
-- =============================================

-- 1. Update Quota Function to V11 Logic
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
    -- Define Quota Rules based on Role and Type (V11 REFINED)
    IF _role = 'mahasiswa' THEN
        CASE _type
            WHEN 'material' THEN
                quota_limit := 1;
                window_interval := INTERVAL '7 days';
                is_per_resource := TRUE; -- Students limited per file (resource_id)
            ELSE
                -- Students shouldn't download finance/attendance
                quota_limit := 0; 
                window_interval := INTERVAL '1 second';
        END CASE;
    ELSIF _role IN ('admin_kelas', 'admin kelas') THEN
        -- Admin Kelas Rules
        CASE _type
            WHEN 'finance' THEN
                quota_limit := 2;
                window_interval := INTERVAL '7 days';
                is_per_resource := FALSE; -- Shared quota (2 total per week)
            WHEN 'attendance_meeting', 'attendance_master', 'material' THEN
                quota_limit := 1;
                window_interval := INTERVAL '24 hours';
                is_per_resource := FALSE; -- Shared quota (1 total per day)
            ELSE
                -- Default safety
                quota_limit := 5;
                window_interval := INTERVAL '1 hour';
        END CASE;
    ELSE
        -- Admin Dev / Super Admins (High limits or Bypass)
        RETURN QUERY SELECT FALSE, 999, NULL::TIMESTAMP WITH TIME ZONE;
        RETURN;
    END IF;

    -- Count downloads in window
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

-- 2. Fix Database Permissions for download_logs
-- Ensure authenticated users can insert and select logs
GRANT INSERT, SELECT ON public.download_logs TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure RLS allows the insert
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'download_logs' AND policyname = 'Users can insert own download logs'
    ) THEN
        CREATE POLICY "Users can insert own download logs" ON public.download_logs
            FOR INSERT TO authenticated
            WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;
