-- Create global_settings table for unified system-wide settings
CREATE TABLE IF NOT EXISTS global_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default billing range
INSERT INTO global_settings (key, value)
VALUES ('billing_range', '{"start": 1, "end": 6}')
ON CONFLICT (key) DO NOTHING;

-- Enable Row Level Security
ALTER TABLE global_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all settings
DROP POLICY IF EXISTS "Public read access for global_settings" ON global_settings;
CREATE POLICY "Public read access for global_settings" 
ON global_settings FOR SELECT 
TO authenticated 
USING (true);

-- Policy: Only admin_dev can update settings
DROP POLICY IF EXISTS "Admin Dev can update global_settings" ON global_settings;
CREATE POLICY "Admin Dev can update global_settings" 
ON global_settings FOR UPDATE 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin_dev'
    )
);

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
