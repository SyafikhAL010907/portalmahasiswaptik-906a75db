-- Migration: Add payment_status to profiles table
-- Created at: 2026-02-19

-- 1. Add payment_status column with a check constraint
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid' 
CHECK (payment_status IN ('unpaid', 'pending', 'paid'));

-- 2. Add whatsapp if missing (to ensure consistency even if already added)
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='whatsapp') THEN
    ALTER TABLE public.profiles ADD COLUMN whatsapp TEXT;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.payment_status IS 'Tracks the payment status of the student (unpaid, pending, paid)';
