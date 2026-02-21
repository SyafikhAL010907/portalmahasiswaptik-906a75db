-- Restore access for admin_dev on Repository tables

-- 1. Semesters (Ensuring policy exists if not already there or dropped)
DROP POLICY IF EXISTS "Admin_dev can manage semesters" ON public.semesters;
CREATE POLICY "Admin_dev can manage semesters" ON public.semesters
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin_dev')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin_dev');

-- 2. Subjects
DROP POLICY IF EXISTS "Admin_dev can manage subjects" ON public.subjects;
CREATE POLICY "Admin_dev can manage subjects" ON public.subjects
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin_dev')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin_dev');

-- 3. Materials
DROP POLICY IF EXISTS "Admin_dev can manage materials" ON public.materials;
CREATE POLICY "Admin_dev can manage materials" ON public.materials
    FOR ALL TO authenticated
    USING (auth.jwt() ->> 'role' = 'admin_dev')
    WITH CHECK (auth.jwt() ->> 'role' = 'admin_dev');
