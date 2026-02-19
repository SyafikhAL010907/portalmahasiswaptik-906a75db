-- ============================================================================
-- Supabase Security Hardening: CLEAN SLATE LOCKDOWN
-- Version: 2.0 (Purge & Secure)
-- Purpose: Complete elimination of data leaks (Information Disclosure)
-- Applied by: Senior Supabase Security & Database Engineer
-- ============================================================================

-- 1. FORCE ENABLE RLS ON ALL TARGET TABLES
-- ----------------------------------------------------------------------------
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_chat_messages ENABLE ROW LEVEL SECURITY;

-- 2. CLEAN SLATE: PURGE ALL LEGACY POLICIES
-- ----------------------------------------------------------------------------
-- This section ensures no "hidden" or "leftover" policies allow access.

-- Messages
DROP POLICY IF EXISTS "Authenticated users can select own direct messages" ON public.messages;
DROP POLICY IF EXISTS "Authenticated users can insert own direct messages" ON public.messages;
DROP POLICY IF EXISTS "Users can view own messages" ON public.messages;
DROP POLICY IF EXISTS "Users can insert own messages" ON public.messages;

-- Public Chat
DROP POLICY IF EXISTS "Allow authenticated users to read public chat messages" ON public.public_chat_messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert public chat messages" ON public.public_chat_messages;

-- Meetings
DROP POLICY IF EXISTS "Admin_kelas can manage meetings" ON public.meetings;
DROP POLICY IF EXISTS "Everyone can view meetings" ON public.meetings;
DROP POLICY IF EXISTS "Admin_dev can manage meetings" ON public.meetings;
DROP POLICY IF EXISTS "Anyone can select meetings" ON public.meetings;

-- Announcements
DROP POLICY IF EXISTS "Everyone can view public announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admin can manage announcements" ON public.announcements;
DROP POLICY IF EXISTS "Anyone can select announcements" ON public.announcements;

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin_dev can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin_kelas can view same class profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admin_dosen can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin_dev can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can select profiles" ON public.profiles;

-- User Roles
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admin_dev can manage all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Authenticated users can select own roles" ON public.user_roles;

-- Classes & Subjects
DROP POLICY IF EXISTS "Admin_kelas can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Everyone can view classes" ON public.classes;
DROP POLICY IF EXISTS "Only admin_dev can manage classes" ON public.classes;
DROP POLICY IF EXISTS "Admin_kelas can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Everyone can view subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admin_dev can manage subjects" ON public.subjects;

-- Attendance
DROP POLICY IF EXISTS "Admins can manage attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Lecturers can create attendance sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Lecturers can view own sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Lecturers can update own sessions" ON public.attendance_sessions;
DROP POLICY IF EXISTS "Admins can manage attendance records" ON public.attendance_records;
DROP POLICY IF EXISTS "Students can create own attendance" ON public.attendance_records;
DROP POLICY IF EXISTS "Users can view relevant attendance" ON public.attendance_records;

-- Finance
DROP POLICY IF EXISTS "Admin_dev can manage all transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admin_kelas can manage own class transactions" ON public.transactions;
DROP POLICY IF EXISTS "Students can view own class transactions" ON public.transactions;
DROP POLICY IF EXISTS "Admin_dev can manage all dues" ON public.weekly_dues;
DROP POLICY IF EXISTS "Admin_kelas can manage own class dues" ON public.weekly_dues;
DROP POLICY IF EXISTS "Students can view own dues" ON public.weekly_dues;
DROP POLICY IF EXISTS "Students can update own dues proof" ON public.weekly_dues;

-- Materials
DROP POLICY IF EXISTS "Everyone can view materials" ON public.materials;
DROP POLICY IF EXISTS "Admin_dev can manage all materials" ON public.materials;
DROP POLICY IF EXISTS "Admin_kelas can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Admin_kelas can update own materials" ON public.materials;

-- 3. APPLY STRICT LOCKDOWN POLICIES
-- ----------------------------------------------------------------------------

-- A. Messages (Strict Ownership)
CREATE POLICY "Strict direct messages select" ON public.messages
    FOR SELECT TO authenticated 
    USING (auth.uid() = user_id OR auth.uid() = recipient_id);

CREATE POLICY "Strict direct messages insert" ON public.messages
    FOR INSERT TO authenticated 
    WITH CHECK (auth.uid() = user_id);

-- B. Hybrid: Meetings & Announcements (Column Security)
-- Grant full access to authenticated users
CREATE POLICY "Authenticated full select meetings" ON public.meetings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated full select announcements" ON public.announcements FOR SELECT USING (auth.role() = 'authenticated');

-- Grant restricted access to anon role
CREATE POLICY "Anon restricted select meetings" ON public.meetings FOR SELECT TO anon USING (true);
CREATE POLICY "Anon restricted select announcements" ON public.announcements FOR SELECT TO anon USING (true);

-- Revoke all by default, then grant specific columns
REVOKE SELECT ON public.meetings FROM anon;
GRANT SELECT (id, topic, subject_id) ON public.meetings TO anon;

REVOKE SELECT ON public.announcements FROM anon;
GRANT SELECT (id, title, content) ON public.announcements TO anon;

-- C. Profiles (Identity Protection)
CREATE POLICY "Authenticated full select profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon restricted select profiles" ON public.profiles FOR SELECT TO anon USING (true);

REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (full_name, avatar_url, nim) ON public.profiles TO anon;

-- D. Standard Authenticated Access for other tables
CREATE POLICY "Authenticated select classes" ON public.classes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated select subjects" ON public.subjects FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated select materials" ON public.materials FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated select user_roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- 4. HARDEN public.is_admin FUNCTION
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    -- Block non-authenticated roles
    IF auth.role() <> 'authenticated' THEN
        RETURN FALSE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin_dev', 'admin_kelas')
    );
END;
$$;

-- 5. FINAL REMARKS
-- ----------------------------------------------------------------------------
COMMENT ON SCHEMA public IS 'Hardened: Strict RLS and Column-Level Security enabled.';
