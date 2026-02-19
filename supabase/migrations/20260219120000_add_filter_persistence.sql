-- Consolidated Migration for Filter Persistence and Payment Persistence
DO $$ 
BEGIN 
  -- Sticky Filters
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_selected_class') THEN
    ALTER TABLE public.profiles ADD COLUMN last_selected_class TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='last_selected_month') THEN
    ALTER TABLE public.profiles ADD COLUMN last_selected_month INTEGER;
  END IF;

  -- Payment Persistence
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='payment_status') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_status TEXT DEFAULT 'unpaid';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='payment_expires_at') THEN
    ALTER TABLE public.profiles ADD COLUMN payment_expires_at TIMESTAMPTZ;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='billing_start_month') THEN
    ALTER TABLE public.profiles ADD COLUMN billing_start_month INTEGER;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='billing_end_month') THEN
    ALTER TABLE public.profiles ADD COLUMN billing_end_month INTEGER;
  END IF;
END $$;

COMMENT ON COLUMN public.profiles.last_selected_class IS 'Last selected class filter ID for the user dashboard.';
COMMENT ON COLUMN public.profiles.last_selected_month IS 'Last selected month filter (0-12) for the user dashboard.';
COMMENT ON COLUMN public.profiles.payment_status IS 'Status of student payment: unpaid, pending, paid.';
COMMENT ON COLUMN public.profiles.payment_expires_at IS 'Expiration timestamp for pending payments.';
COMMENT ON COLUMN public.profiles.billing_start_month IS 'User-specific billing start month preference.';
COMMENT ON COLUMN public.profiles.billing_end_month IS 'User-specific billing end month preference.';

-- Enable RLS and add/update strict policy for individual updates
-- We use USING (auth.uid() = id) so users can only update their own row.
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update their own preferences" ON public.profiles;
    CREATE POLICY "Users can update their own preferences" 
    ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
END $$;

-- PostgREST Schema Reload Instruction: 
-- NOTIFY pgrst, 'reload schema';
