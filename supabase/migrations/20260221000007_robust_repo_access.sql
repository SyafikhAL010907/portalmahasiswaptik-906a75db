-- =============================================
-- Migration: Robust Repo Access (v3)
-- Tables: semesters, subjects, materials
-- =============================================

-- 1. Redefine is_admin to be extremely robust
-- Checks user_roles enum AND profiles text field for ANY variant of admin strings
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER -- Use DEFINER to ensure it can read all necessary tables
SET search_path = public
AS $$
BEGIN
    -- 1. Check user_roles table (Enum Track)
    IF EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id 
        AND role IN ('admin_dev', 'admin_kelas')
    ) THEN
        RETURN TRUE;
    END IF;

    -- 2. Check profiles table (Text Track - handles variants like 'admin kelas')
    IF EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE user_id = _user_id 
        AND (
            role = 'admin_dev' OR 
            role = 'admin_kelas' OR 
            role = 'admin kelas'
        )
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;

-- 2. Apply Robust Policies to Semesters
DROP POLICY IF EXISTS "Admins can manage semesters" ON public.semesters;
DROP POLICY IF EXISTS "Enable all for repo admins" ON public.semesters;
CREATE POLICY "Robust admin manage semesters" ON public.semesters
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 3. Apply Robust Policies to Subjects
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Enable all for repo admins" ON public.subjects;
CREATE POLICY "Robust admin manage subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));

-- 4. Apply Robust Policies to Materials
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Enable all for repo admins" ON public.materials;
CREATE POLICY "Robust admin manage materials" ON public.materials
    FOR ALL TO authenticated
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
