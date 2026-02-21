-- =============================================
-- Migration: Hardened CRUD Access for Repo Admins
-- Tables: semesters, subjects, materials
-- =============================================

-- 1. Semesters
DROP POLICY IF EXISTS "Admins can manage semesters" ON public.semesters;
CREATE POLICY "Admins can manage semesters" ON public.semesters
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin_dev' OR 
        auth.jwt() ->> 'role' = 'admin_kelas' OR
        auth.jwt() ->> 'role' = 'admin kelas' OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_dev', 'admin_kelas', 'admin kelas'))
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'admin_dev' OR 
        auth.jwt() ->> 'role' = 'admin_kelas' OR
        auth.jwt() ->> 'role' = 'admin kelas' OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_dev', 'admin_kelas', 'admin kelas'))
    );

-- 2. Subjects
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin_dev' OR 
        auth.jwt() ->> 'role' = 'admin_kelas' OR
        auth.jwt() ->> 'role' = 'admin kelas' OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_dev', 'admin_kelas', 'admin kelas'))
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'admin_dev' OR 
        auth.jwt() ->> 'role' = 'admin_kelas' OR
        auth.jwt() ->> 'role' = 'admin kelas' OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_dev', 'admin_kelas', 'admin kelas'))
    );

-- 3. Materials
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials" ON public.materials
    FOR ALL TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin_dev' OR 
        auth.jwt() ->> 'role' = 'admin_kelas' OR
        auth.jwt() ->> 'role' = 'admin kelas' OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_dev', 'admin_kelas', 'admin kelas'))
    )
    WITH CHECK (
        auth.jwt() ->> 'role' = 'admin_dev' OR 
        auth.jwt() ->> 'role' = 'admin_kelas' OR
        auth.jwt() ->> 'role' = 'admin kelas' OR
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_dev', 'admin_kelas', 'admin kelas'))
    );
