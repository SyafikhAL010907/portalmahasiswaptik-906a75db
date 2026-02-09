-- =============================================
-- Fix RLS Policies for Admin Kelas and Admin Dev
-- =============================================

-- 1. Allow Admin Kelas to manage Classes
CREATE POLICY "Admin_kelas can manage classes" ON public.classes
    FOR ALL USING (public.has_role(auth.uid(), 'admin_kelas'));

-- 2. Allow Admin Kelas to manage Subjects
CREATE POLICY "Admin_kelas can manage subjects" ON public.subjects
    FOR ALL USING (public.has_role(auth.uid(), 'admin_kelas'));

-- 3. Allow Admin Kelas to manage Meetings
CREATE POLICY "Admin_kelas can manage meetings" ON public.meetings
    FOR ALL USING (public.has_role(auth.uid(), 'admin_kelas'));

-- 4. Allow Admin Dev and Admin Kelas to manage Attendance Sessions
-- (Previously only admin_dosen could insert, and admins weren't explicitly covered for full management)
CREATE POLICY "Admins can manage attendance sessions" ON public.attendance_sessions
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin_dev') OR 
        public.has_role(auth.uid(), 'admin_kelas')
    );

-- 5. Allow Admin Dev and Admin Kelas to manage Attendance Records
-- (Necessary for 'Simpan Permanen' attendance feature)
CREATE POLICY "Admins can manage attendance records" ON public.attendance_records
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin_dev') OR 
        public.has_role(auth.uid(), 'admin_kelas')
    );
