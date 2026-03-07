-- =============================================
-- Migration: Upgrade Download Logs & Quota Logic
-- Purpose: Support multi-type download limiting (Finance, Attendance, Materials)
-- =============================================

-- 1. Upgrade download_logs table
ALTER TABLE public.download_logs 
  DROP CONSTRAINT IF EXISTS download_logs_material_id_fkey,
  ALTER COLUMN material_id DROP NOT NULL;

-- Rename and Add type
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='download_logs' AND column_name='download_type') THEN
        ALTER TABLE public.download_logs RENAME COLUMN material_id TO resource_id;
        ALTER TABLE public.download_logs ADD COLUMN download_type TEXT CHECK (download_type IN ('material', 'finance', 'attendance_meeting', 'attendance_master'));
        ALTER TABLE public.download_logs ADD COLUMN metadata JSONB;
    END IF;
END $$;

-- Update existing logs to 'material' type
UPDATE public.download_logs SET download_type = 'material' WHERE download_type IS NULL;

-- 2. Create actual quota check function (V10 - Role & Resource Aware)
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
    -- Define Quota Rules based on Role and Type
    IF _role = 'mahasiswa' THEN
        CASE _type
            WHEN 'material' THEN
                quota_limit := 1;
                window_interval := INTERVAL '7 days';
                is_per_resource := TRUE; -- Students limited per file
            ELSE
                -- Students shouldn't really download finance/attendance, but let's be safe
                quota_limit := 0; 
                window_interval := INTERVAL '1 second';
        END CASE;
    ELSE
        -- Admin / Others
        CASE _type
            WHEN 'finance' THEN
                quota_limit := 2;
                window_interval := INTERVAL '7 days';
                is_per_resource := FALSE; -- Global per type
            WHEN 'attendance_meeting', 'attendance_master' THEN
                quota_limit := 1;
                window_interval := INTERVAL '24 hours';
                is_per_resource := FALSE;
            WHEN 'material' THEN
                quota_limit := 1;
                window_interval := INTERVAL '24 hours';
                is_per_resource := TRUE; -- Admin limited per file too, but shorter window
            ELSE
                RETURN QUERY SELECT FALSE, 999, NULL::TIMESTAMP WITH TIME ZONE;
                RETURN;
        END CASE;
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
