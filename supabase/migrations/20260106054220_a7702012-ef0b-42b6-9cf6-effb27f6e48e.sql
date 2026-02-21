-- =====================================================
-- SECURITY FIX: Restrict access to sensitive data
-- =====================================================

-- 1. Fix profiles table - only allow viewing own profile or profiles of friends/followers
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create function to check if user can view a profile
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    _viewer_id = _profile_user_id -- Own profile
    OR EXISTS ( -- Friends
      SELECT 1 FROM public.friendships 
      WHERE status = 'accepted' 
      AND (
        (requester_id = _viewer_id AND addressee_id = _profile_user_id)
        OR (addressee_id = _viewer_id AND requester_id = _profile_user_id)
      )
    )
    OR EXISTS ( -- Following
      SELECT 1 FROM public.followers 
      WHERE follower_id = _viewer_id AND following_id = _profile_user_id
    )
    OR public.has_role(_viewer_id, 'admin')
    OR public.has_role(_viewer_id, 'super_admin')
    OR public.has_role(_viewer_id, 'moderator')
$$;

-- Policy: Users can view own profile, friends, followers, or if admin
CREATE POLICY "Users can view accessible profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), user_id));

-- 2. Fix bets table - only show own bets
DROP POLICY IF EXISTS "Users can view all bets for leaderboard" ON public.bets;
DROP POLICY IF EXISTS "Users can view all bets" ON public.bets;

CREATE POLICY "Users can view own bets"
ON public.bets FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 3. Fix group_chat_messages - only authenticated users can view
DROP POLICY IF EXISTS "Anyone can view messages" ON public.group_chat_messages;
DROP POLICY IF EXISTS "Anyone can view non-private messages" ON public.group_chat_messages;

CREATE POLICY "Authenticated users can view public messages"
ON public.group_chat_messages FOR SELECT
TO authenticated
USING (
  is_private = false 
  OR user_id = auth.uid() 
  OR private_to_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- 4. Fix user_roles - only view own role or if admin
DROP POLICY IF EXISTS "Users can view all roles" ON public.user_roles;

CREATE POLICY "Users can view own role"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
);

-- 5. Fix site_bans - create function to check ban status without exposing details
DROP POLICY IF EXISTS "Anyone can check if user is banned" ON public.site_bans;

-- Function to check if a user is banned (returns boolean only)
CREATE OR REPLACE FUNCTION public.is_user_banned(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.site_bans 
    WHERE user_id = _user_id 
    AND (banned_until IS NULL OR banned_until > now())
  )
$$;

-- Only admins can view full ban records
CREATE POLICY "Admins can view ban records"
ON public.site_bans FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'moderator')
);

-- 6. Fix private_messages - ensure only participants can view
DROP POLICY IF EXISTS "Users can view their conversations messages" ON public.private_messages;

CREATE POLICY "Users can view own conversation messages"
ON public.private_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);