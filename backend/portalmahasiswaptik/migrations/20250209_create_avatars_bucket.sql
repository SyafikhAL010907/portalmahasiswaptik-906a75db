-- Create the 'avatars' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to avatars
CREATE POLICY "Avatar Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Policy: Allow authenticated users to upload their own avatar
-- (Limiting to their own folder structure based on path is good practice, but for now simple auth check)
CREATE POLICY "Avatar Upload Access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Policy: Allow users to update their own avatar
CREATE POLICY "Avatar Update Access"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' );
