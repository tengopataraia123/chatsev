-- Fix RLS policies for profile_visits to support upsert properly

-- Drop old duplicate/conflicting policies
DROP POLICY IF EXISTS "Users can insert profile visits" ON public.profile_visits;
DROP POLICY IF EXISTS "Users can record profile visits" ON public.profile_visits;
DROP POLICY IF EXISTS "Users can update their own visits" ON public.profile_visits;
DROP POLICY IF EXISTS "Users can view their own profile visitors" ON public.profile_visits;
DROP POLICY IF EXISTS "Users can view visits to their profile" ON public.profile_visits;

-- Create proper policies

-- Users can insert visits (they must be the visitor)
CREATE POLICY "Users can insert visits"
ON public.profile_visits
FOR INSERT
WITH CHECK (auth.uid() = visitor_user_id);

-- Users can update visits they made (for upsert to work with visited_at update)
CREATE POLICY "Users can update visits they made"
ON public.profile_visits
FOR UPDATE
USING (auth.uid() = visitor_user_id)
WITH CHECK (auth.uid() = visitor_user_id);

-- Profile owners can view their visitors
CREATE POLICY "Profile owners can view visitors"
ON public.profile_visits
FOR SELECT
USING (auth.uid() = profile_user_id);

-- Profile owners can update their visits (to mark as seen)
CREATE POLICY "Profile owners can mark visits as seen"
ON public.profile_visits
FOR UPDATE
USING (auth.uid() = profile_user_id)
WITH CHECK (auth.uid() = profile_user_id);