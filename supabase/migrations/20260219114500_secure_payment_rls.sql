-- Migration: Strict RLS for Payments
-- Purpose: Ensure users can only update their own payment status and dues.

-- 1. Secure Weekly Dues
ALTER TABLE public.weekly_dues ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own dues
DROP POLICY IF EXISTS "Users can view own dues" ON public.weekly_dues;
CREATE POLICY "Users can view own dues" 
ON public.weekly_dues FOR SELECT 
TO authenticated 
USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Allow users to upsert their own dues (for payment flow)
DROP POLICY IF EXISTS "Users can manage own dues" ON public.weekly_dues;
CREATE POLICY "Users can manage own dues" 
ON public.weekly_dues FOR ALL 
TO authenticated 
USING (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()))
WITH CHECK (student_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid()));

-- Allow admins to do everything on weekly_dues
DROP POLICY IF EXISTS "Admins can manage all dues" ON public.weekly_dues;
CREATE POLICY "Admins can manage all dues" 
ON public.weekly_dues FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- 2. Secure Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Ensure users can only update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure users can view their own profile
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" 
ON public.profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Allow admins full access to profiles
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles FOR ALL 
TO authenticated 
USING (public.is_admin(auth.uid()));

-- Grant access to authenticated users to view all profiles (if needed for list/search)
-- If the UI requires searching for other students, we need this:
DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view all profiles" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);
