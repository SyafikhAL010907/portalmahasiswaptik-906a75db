-- =============================================
-- Migration: Grant CRUD Access to admin_kelas
-- Tables: semesters, subjects, materials
-- =============================================

-- 1. Semesters
DROP POLICY IF EXISTS "Admin_dev can manage semesters" ON public.semesters;
DROP POLICY IF EXISTS "Admins can manage semesters" ON public.semesters;
CREATE POLICY "Admins can manage semesters" ON public.semesters
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin_dev' OR auth.jwt() ->> 'role' = 'admin_kelas')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin_dev' OR auth.jwt() ->> 'role' = 'admin_kelas');

-- 2. Subjects
DROP POLICY IF EXISTS "Admin_dev can manage subjects" ON public.subjects;
DROP POLICY IF EXISTS "Admins can manage subjects" ON public.subjects;
CREATE POLICY "Admins can manage subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin_dev' OR auth.jwt() ->> 'role' = 'admin_kelas')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin_dev' OR auth.jwt() ->> 'role' = 'admin_kelas');

-- 3. Materials
DROP POLICY IF EXISTS "Admin_dev can manage materials" ON public.materials;
DROP POLICY IF EXISTS "Admins can manage materials" ON public.materials;
CREATE POLICY "Admins can manage materials" ON public.materials
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin_dev' OR auth.jwt() ->> 'role' = 'admin_kelas')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin_dev' OR auth.jwt() ->> 'role' = 'admin_kelas');
