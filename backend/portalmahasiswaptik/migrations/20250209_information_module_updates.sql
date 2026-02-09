-- Modify announcements table
ALTER TABLE announcements 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'normal',
ADD COLUMN IF NOT EXISTS is_new boolean DEFAULT true;

-- Create competitions table
CREATE TABLE IF NOT EXISTS competitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    organizer TEXT NOT NULL,
    deadline DATE NOT NULL,
    event_dates TEXT,
    team_size TEXT,
    prize TEXT,
    link_url TEXT,
    category TEXT NOT NULL,
    badge TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Create class_achievements table
CREATE TABLE IF NOT EXISTS class_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    class_id UUID REFERENCES classes(id) NOT NULL,
    competition_name TEXT NOT NULL,
    student_names TEXT NOT NULL, -- Comma separated names or JSON array
    rank TEXT NOT NULL, -- 'Juara 1', 'Finalist', etc.
    event_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- Add RLS Policies (Draft - actual application depends on Supabase setting)
ALTER TABLE competitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE class_achievements ENABLE ROW LEVEL SECURITY;

-- Policies for competitions
-- Everyone can read
CREATE POLICY "Everyone can view competitions" ON competitions FOR SELECT USING (true);
-- Only admins can insert/update/delete (This logic usually handled in easy RLS helpers or triggers, 
-- but here assuming a generic admin check or relying on application-side role check with service role if needed, 
-- though frontend calls usually use user token. 
-- For now, we'll allow authenticated users to read, and we'll rely on backend/frontend role checks for mutation 
-- or specific policy if 'user_roles' table is accessible).

-- Assuming typical policy:
-- CREATE POLICY "Admins can manage competitions" ON competitions USING (
--   exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin_dev', 'admin_kelas', 'admin_dosen'))
-- );
