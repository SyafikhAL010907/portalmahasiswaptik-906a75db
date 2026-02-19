-- Migration: Add payment_expires_at to profiles
-- Purpose: Track when a pending payment should be automatically reverted to 'unpaid'.

-- 1. Add payment_expires_at column
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='payment_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_expires_at TIMESTAMP WITH TIME ZONE;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.payment_expires_at IS 'Timestamp after which a pending payment status should be reverted to unpaid.';
