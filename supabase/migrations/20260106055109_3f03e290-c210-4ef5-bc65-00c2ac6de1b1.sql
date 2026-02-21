-- =====================================================
-- FIX: Allow viewing all profiles for basic info (public profiles)
-- But restrict sensitive data based on relationship
-- =====================================================

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can view accessible profiles" ON public.profiles;

-- Create a more permissive policy - profiles are generally public
-- (privacy is controlled at application level via privacy_settings table)
CREATE POLICY "Authenticated users can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- Also allow viewing profile visits properly
DROP POLICY IF EXISTS "Users can view their profile visits" ON public.profile_visits;
DROP POLICY IF EXISTS "Users can view visits to their profile" ON public.profile_visits;

CREATE POLICY "Users can view visits to their profile"
ON public.profile_visits FOR SELECT
TO authenticated
USING (profile_user_id = auth.uid());

CREATE POLICY "Users can insert profile visits"
ON public.profile_visits FOR INSERT
TO authenticated
WITH CHECK (visitor_user_id = auth.uid());

-- Fix user_roles to allow checking other users' roles (needed for displaying admin badges, etc)
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

CREATE POLICY "Authenticated users can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (true);