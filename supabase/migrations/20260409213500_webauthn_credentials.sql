-- Migration: Add user_credentials table for WebAuthn (FaceID/Fingerprint)
-- Created at: 2026-04-09 21:35:00

CREATE TABLE IF NOT EXISTS public.user_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE UNIQUE,
    credential_id BYTEA NOT NULL UNIQUE,
    public_key BYTEA NOT NULL,
    attestation_type TEXT,
    aaguid UUID,
    sign_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookup by credential_id during login
CREATE INDEX IF NOT EXISTS idx_user_credentials_cred_id ON public.user_credentials(credential_id);
-- Index for finding all credentials for a specific user
CREATE INDEX IF NOT EXISTS idx_user_credentials_user_id ON public.user_credentials(user_id);

-- Enable Row Level Security
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_credentials' AND policyname = 'Users can view their own credentials'
    ) THEN
        CREATE POLICY "Users can view their own credentials" 
        ON public.user_credentials FOR SELECT 
        USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_credentials' AND policyname = 'Users can manage their own biometric credentials'
    ) THEN
        -- POLICY: MAHASISWA CUMA BISA LIHAT/HAPUS PUNYA SENDIRI
        CREATE POLICY "Users can manage their own biometric credentials"
        ON public.user_credentials
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_credentials' AND policyname = 'Admins can view all credentials'
    ) THEN
        -- POLICY: ADMIN (DEV, KELAS, DOSEN) BISA LIHAT DATA BUAT MONITORING
        CREATE POLICY "Admins can view all credentials"
        ON public.user_credentials
        FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role IN ('admin_dev', 'admin_kelas', 'admin_dosen')
          )
        );
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'user_credentials' AND policyname = 'AdminDev can reset any credential'
    ) THEN
        -- POLICY: ADMIN_DEV BISA RESET (DELETE) DATA SIAPAPUN
        CREATE POLICY "AdminDev can reset any credential"
        ON public.user_credentials
        FOR DELETE
        USING (
          EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE user_id = auth.uid() AND role = 'admin_dev'
          )
        );
    END IF;
END $$;

-- Comment for documentation
COMMENT ON TABLE public.user_credentials IS 'Stores WebAuthn public keys for biometric authentication (FaceID/Fingerprint).';
