-- =============================================
-- 1. Create ENUM for Roles
-- =============================================
CREATE TYPE public.app_role AS ENUM ('admin_dev', 'admin_kelas', 'admin_dosen', 'mahasiswa');

-- =============================================
-- 2. Create Classes Table
-- =============================================
CREATE TABLE public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Insert default classes
INSERT INTO public.classes (name) VALUES ('A'), ('B'), ('C');

-- =============================================
-- 3. Create Profiles Table
-- =============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    nim TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    class_id UUID REFERENCES public.classes(id),
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 4. Create User Roles Table (CRITICAL for RBAC)
-- =============================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (user_id, role)
);

-- =============================================
-- 5. Create Subjects Table
-- =============================================
CREATE TABLE public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    semester INTEGER NOT NULL CHECK (semester >= 1 AND semester <= 7),
    sks INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 6. Create Meetings Table (Pertemuan)
-- =============================================
CREATE TABLE public.meetings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    meeting_number INTEGER NOT NULL CHECK (meeting_number >= 1 AND meeting_number <= 14),
    topic TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (subject_id, meeting_number)
);

-- =============================================
-- 7. Create Attendance Sessions Table (QR Sessions)
-- =============================================
CREATE TABLE public.attendance_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meeting_id UUID REFERENCES public.meetings(id) ON DELETE CASCADE NOT NULL,
    class_id UUID REFERENCES public.classes(id) NOT NULL,
    lecturer_id UUID REFERENCES auth.users(id) NOT NULL,
    qr_code TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 8. Create Attendance Records Table
-- =============================================
CREATE TABLE public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.attendance_sessions(id) ON DELETE CASCADE NOT NULL,
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL DEFAULT 'present' CHECK (status IN ('present', 'late', 'absent', 'excused')),
    scanned_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (session_id, student_id)
);

-- =============================================
-- 9. Create Financial Transactions Table
-- =============================================
CREATE TABLE public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES public.classes(id) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    proof_url TEXT,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 10. Create Weekly Dues (Iuran) Table
-- =============================================
CREATE TABLE public.weekly_dues (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    amount DECIMAL(12,2) NOT NULL DEFAULT 5000,
    status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('paid', 'pending', 'unpaid')),
    proof_url TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    UNIQUE (student_id, week_number, year)
);

-- =============================================
-- 11. Create Repository Materials Table
-- =============================================
CREATE TABLE public.materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE NOT NULL,
    semester INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    file_type TEXT NOT NULL CHECK (file_type IN ('pdf', 'video', 'image', 'other')),
    file_url TEXT NOT NULL,
    file_size INTEGER,
    uploaded_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- =============================================
-- 12. Create Announcements Table
-- =============================================
CREATE TABLE public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general',
    is_pinned BOOLEAN DEFAULT false,
    target_classes UUID[] DEFAULT NULL,
    created_by UUID REFERENCES auth.users(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE
);

-- =============================================
-- 13. Enable RLS on All Tables
-- =============================================
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_dues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 14. Create Security Definer Functions
-- =============================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's class_id
CREATE OR REPLACE FUNCTION public.get_user_class_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT class_id
    FROM public.profiles
    WHERE user_id = _user_id
$$;

-- Function to check if user is admin (dev or kelas)
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role IN ('admin_dev', 'admin_kelas')
    )
$$;

-- =============================================
-- 15. RLS Policies for Classes
-- =============================================
CREATE POLICY "Everyone can view classes" ON public.classes
    FOR SELECT USING (true);

CREATE POLICY "Only admin_dev can manage classes" ON public.classes
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

-- =============================================
-- 16. RLS Policies for Profiles
-- =============================================
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin_dev can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin_dev'));

CREATE POLICY "Admin_kelas can view same class profiles" ON public.profiles
    FOR SELECT USING (
        public.has_role(auth.uid(), 'admin_kelas') 
        AND class_id = public.get_user_class_id(auth.uid())
    );

CREATE POLICY "Admin_dosen can view all profiles" ON public.profiles
    FOR SELECT USING (public.has_role(auth.uid(), 'admin_dosen'));

CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admin_dev can manage all profiles" ON public.profiles
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

-- =============================================
-- 17. RLS Policies for User Roles
-- =============================================
CREATE POLICY "Users can view own roles" ON public.user_roles
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admin_dev can manage all roles" ON public.user_roles
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

-- =============================================
-- 18. RLS Policies for Subjects
-- =============================================
CREATE POLICY "Everyone can view subjects" ON public.subjects
    FOR SELECT USING (true);

CREATE POLICY "Admin_dev can manage subjects" ON public.subjects
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

-- =============================================
-- 19. RLS Policies for Meetings
-- =============================================
CREATE POLICY "Everyone can view meetings" ON public.meetings
    FOR SELECT USING (true);

CREATE POLICY "Admin_dev can manage meetings" ON public.meetings
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

-- =============================================
-- 20. RLS Policies for Attendance Sessions
-- =============================================
CREATE POLICY "Lecturers can create attendance sessions" ON public.attendance_sessions
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin_dosen'));

CREATE POLICY "Lecturers can view own sessions" ON public.attendance_sessions
    FOR SELECT USING (
        lecturer_id = auth.uid() 
        OR public.has_role(auth.uid(), 'admin_dev')
        OR (public.has_role(auth.uid(), 'mahasiswa') AND is_active = true)
    );

CREATE POLICY "Lecturers can update own sessions" ON public.attendance_sessions
    FOR UPDATE USING (lecturer_id = auth.uid());

-- =============================================
-- 21. RLS Policies for Attendance Records
-- =============================================
CREATE POLICY "Students can create own attendance" ON public.attendance_records
    FOR INSERT WITH CHECK (
        public.has_role(auth.uid(), 'mahasiswa') 
        AND student_id = auth.uid()
    );

CREATE POLICY "Users can view relevant attendance" ON public.attendance_records
    FOR SELECT USING (
        student_id = auth.uid()
        OR public.has_role(auth.uid(), 'admin_dev')
        OR public.has_role(auth.uid(), 'admin_dosen')
    );

-- =============================================
-- 22. RLS Policies for Transactions
-- =============================================
CREATE POLICY "Admin_dev can manage all transactions" ON public.transactions
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

CREATE POLICY "Admin_kelas can manage own class transactions" ON public.transactions
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin_kelas')
        AND class_id = public.get_user_class_id(auth.uid())
    );

CREATE POLICY "Students can view own class transactions" ON public.transactions
    FOR SELECT USING (
        public.has_role(auth.uid(), 'mahasiswa')
        AND class_id = public.get_user_class_id(auth.uid())
    );

-- =============================================
-- 23. RLS Policies for Weekly Dues
-- =============================================
CREATE POLICY "Admin_dev can manage all dues" ON public.weekly_dues
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

CREATE POLICY "Admin_kelas can manage own class dues" ON public.weekly_dues
    FOR ALL USING (
        public.has_role(auth.uid(), 'admin_kelas')
        AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.user_id = weekly_dues.student_id 
            AND profiles.class_id = public.get_user_class_id(auth.uid())
        )
    );

CREATE POLICY "Students can view own dues" ON public.weekly_dues
    FOR SELECT USING (student_id = auth.uid());

CREATE POLICY "Students can update own dues proof" ON public.weekly_dues
    FOR UPDATE USING (student_id = auth.uid());

-- =============================================
-- 24. RLS Policies for Materials
-- =============================================
CREATE POLICY "Everyone can view materials" ON public.materials
    FOR SELECT USING (true);

CREATE POLICY "Admin_dev can manage all materials" ON public.materials
    FOR ALL USING (public.has_role(auth.uid(), 'admin_dev'));

CREATE POLICY "Admin_kelas can manage materials" ON public.materials
    FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'admin_kelas'));

CREATE POLICY "Admin_kelas can update own materials" ON public.materials
    FOR UPDATE USING (
        public.has_role(auth.uid(), 'admin_kelas') 
        AND uploaded_by = auth.uid()
    );

-- =============================================
-- 25. RLS Policies for Announcements
-- =============================================
CREATE POLICY "Everyone can view public announcements" ON public.announcements
    FOR SELECT USING (
        target_classes IS NULL 
        OR public.get_user_class_id(auth.uid()) = ANY(target_classes)
        OR public.has_role(auth.uid(), 'admin_dev')
    );

CREATE POLICY "Admin can manage announcements" ON public.announcements
    FOR ALL USING (public.is_admin(auth.uid()));

-- =============================================
-- 26. Create Updated_at Trigger Function
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON public.materials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 27. Insert Sample Subjects
-- =============================================
INSERT INTO public.subjects (name, code, semester, sks) VALUES
('Pengantar Teknologi Informasi', 'PTI101', 1, 3),
('Algoritma dan Pemrograman', 'AP102', 1, 4),
('Matematika Dasar', 'MD103', 1, 3),
('Bahasa Inggris I', 'BI104', 1, 2),
('Pancasila', 'PAN105', 1, 2),
('Agama', 'AGM106', 1, 2),
('Struktur Data', 'SD201', 2, 3),
('Pemrograman Web', 'PW202', 2, 3),
('Basis Data', 'BD203', 2, 3),
('Jaringan Komputer', 'JK204', 2, 3),
('Sistem Operasi', 'SO205', 2, 3),
('Matematika Diskrit', 'MKD206', 2, 3),
('Pemrograman Berorientasi Objek', 'PBO301', 3, 3),
('Analisis dan Perancangan Sistem', 'APS302', 3, 3),
('Interaksi Manusia Komputer', 'IMK303', 3, 3),
('Statistika', 'STA304', 3, 3),
('Kewirausahaan', 'KWU305', 3, 2),
('Bahasa Inggris II', 'BI306', 3, 2);

-- =============================================
-- 28. Insert Meetings for Each Subject
-- =============================================
DO $$
DECLARE
    subj RECORD;
    i INTEGER;
BEGIN
    FOR subj IN SELECT id FROM public.subjects LOOP
        FOR i IN 1..14 LOOP
            INSERT INTO public.meetings (subject_id, meeting_number, topic)
            VALUES (subj.id, i, 'Pertemuan ' || i);
        END LOOP;
    END LOOP;
END $$;