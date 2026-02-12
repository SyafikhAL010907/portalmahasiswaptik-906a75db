-- Add audit columns to attendance_records
ALTER TABLE attendance_records
ADD COLUMN IF NOT EXISTS method TEXT DEFAULT 'qr', -- 'qr' or 'manual'
ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id);
