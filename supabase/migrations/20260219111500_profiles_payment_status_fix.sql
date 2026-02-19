-- Migration: Profiles Payment Status and WhatsApp Fix
-- Ensures payment_status and whatsapp exist and have correct constraints/RLS

-- 1. Ensure whatsapp column exists
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='whatsapp') THEN
    ALTER TABLE public.profiles ADD COLUMN whatsapp TEXT;
  END IF;
END $$;

-- 2. Ensure payment_status column exists with constraint
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='payment_status') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'unpaid';
  ELSE
    -- If exists, ensure it is NOT NULL and has the default
    ALTER TABLE public.profiles ALTER COLUMN payment_status SET NOT NULL;
    ALTER TABLE public.profiles ALTER COLUMN payment_status SET DEFAULT 'unpaid';
  END IF;
END $$;

-- Drop existing check if any and recreate to be sure
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_payment_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_payment_status_check 
  CHECK (payment_status IN ('unpaid', 'pending', 'paid'));

-- 3. Security: Ensure RLS allows users to update their own profile (specifically payment_status)
-- Check if RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policy for users to update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for users to view their own profile (usually already exists, but for safety)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Policy for admins to view/update all (assuming admin role or similar exists)
-- This is just a placeholder if needed, normally handled by existing security setup.

COMMENT ON COLUMN public.profiles.payment_status IS 'Tracks the payment status of the student (unpaid, pending, paid)';
COMMENT ON COLUMN public.profiles.whatsapp IS 'Student WhatsApp contact number';
