-- Create global_configs table for system-wide settings
CREATE TABLE IF NOT EXISTS global_configs (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default billing range if not exists
INSERT INTO global_configs (key, value) VALUES
('billing_start_month', '1'),
('billing_end_month', '6')
ON CONFLICT (key) DO NOTHING;

-- Log the creation
DO $$
BEGIN
    RAISE NOTICE 'Created global_configs table and inserted defaults';
END $$;
