-- =============================================
-- Migration: Create Download Logs for Rate Limiting
-- Purpose: Track student downloads to prevent spam (1 file / 7 days)
-- =============================================

-- 1. Create Download Logs Table
CREATE TABLE IF NOT EXISTS public.download_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    material_id UUID REFERENCES public.materials(id) ON DELETE CASCADE NOT NULL,
    downloaded_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    -- Unique constraint: A user can only have one active record per material in the logic, 
    -- but for simplicity of logging history, we don't strictly enforce UNIQUE(user_id, material_id) here.
    -- However, for the '1 file = 1 download' rule, we can use a composite unique if we only care about the latest.
    -- Let's use it to make 'upsert' easier if they re-download after 7 days, or just track all.
    -- The user requested '1 File = 1 Kali Download dalam 7 Hari'.
    -- To keep it clean, we'll allow multiple logs but the logic will check the latest.
    -- Actually, UNIQUE(user_id, material_id) is better if we only care about the lock. 
    -- But if they download AFTER 7 days, we might want a new log or update the old one.
    -- Let's stick to NO UNIQUE to keep a full audit trail, and handle the 7-day logic in the function.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Enable RLS
ALTER TABLE public.download_logs ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can insert their own logs
CREATE POLICY "Users can insert own download logs" ON public.download_logs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can see their own logs
CREATE POLICY "Users can view own download logs" ON public.download_logs
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Admins can see all logs
CREATE POLICY "Admins can view all download logs" ON public.download_logs
    FOR SELECT TO authenticated
    USING (public.is_admin(auth.uid()));

-- BREAKING: PROTECT LOGS FROM DELETION/UPDATE BY USERS (Anti-Spam)
-- Only service_role or super admins should ever delete logs.
-- Authenticated users have NO UPDATE/DELETE policy, so they are blocked by default.

-- 4. Helper Function: Check if user is Mahasiswa
CREATE OR REPLACE FUNCTION public.is_mahasiswa(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- 1. Check user_roles (Enum track)
    IF EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id 
        AND role = 'mahasiswa'
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check profiles (Text track fallback)
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = _user_id 
        AND role = 'mahasiswa'
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 5. Helper Function: Check for recent download (7-day window)
CREATE OR REPLACE FUNCTION public.has_recent_download(_user_id UUID, _material_id UUID)
RETURNS TABLE (restricted BOOLEAN, available_at TIMESTAMP WITH TIME ZONE)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    last_download TIMESTAMP WITH TIME ZONE;
BEGIN
    SELECT downloaded_at INTO last_download
    FROM public.download_logs
    WHERE user_id = _user_id AND material_id = _material_id
    ORDER BY downloaded_at DESC
    LIMIT 1;

    IF last_download IS NOT NULL AND last_download > (now() - INTERVAL '7 days') THEN
        RETURN QUERY SELECT TRUE, last_download + INTERVAL '7 days';
    ELSE
        RETURN QUERY SELECT FALSE, NULL::TIMESTAMP WITH TIME ZONE;
    END IF;
END;
$$;
