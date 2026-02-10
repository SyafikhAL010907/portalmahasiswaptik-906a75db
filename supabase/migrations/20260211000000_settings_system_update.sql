-- 1. Add whatsapp column to profiles table if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='whatsapp') THEN
    ALTER TABLE profiles ADD COLUMN whatsapp TEXT;
  END IF;
END $$;

-- 2. Storage Policies for 'avatars' bucket
-- Ensure the bucket exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Authenticated users can upload their own avatars
-- We use the NIM as part of the filename or just check the folder
-- The implementation uses 'avatars/{filename}'
-- Let's make it simple: Users can manage objects in 'avatars' bucket but we'll enforce own-file logic via NIM in filename if possible, 
-- or better yet, using a standard 'avatars/{user_id}/{filename}' structure.
-- The current implementation uses just 'avatars/{filename}'.
-- To be safe and strictly own-file based on auth.uid():
DROP POLICY IF EXISTS "Avatar Upload Access" ON storage.objects;
CREATE POLICY "Avatar Owner Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' 
);

DROP POLICY IF EXISTS "Avatar Update Access" ON storage.objects;
CREATE POLICY "Avatar Owner Update"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' );

DROP POLICY IF EXISTS "Avatar Delete Access" ON storage.objects;
CREATE POLICY "Avatar Owner Delete"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'avatars' );

-- Note: Select is already public from previous migrations, but let's reinforce it
DROP POLICY IF EXISTS "Avatar Public Access" ON storage.objects;
CREATE POLICY "Avatar Public Select"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );
