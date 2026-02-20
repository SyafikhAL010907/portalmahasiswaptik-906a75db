-- Add missing columns to materials table
ALTER TABLE public.materials 
ADD COLUMN IF NOT EXISTS storage_type TEXT DEFAULT 'supabase' CHECK (storage_type IN ('supabase', 'google_drive')),
ADD COLUMN IF NOT EXISTS external_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;

-- Ensure semesters and subjects have drive_folder_id (if not already added)
ALTER TABLE public.semesters 
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;

ALTER TABLE public.subjects 
ADD COLUMN IF NOT EXISTS drive_folder_id TEXT;
