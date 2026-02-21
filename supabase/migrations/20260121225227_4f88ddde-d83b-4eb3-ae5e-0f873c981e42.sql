-- Drop all existing policies on both tables
DROP POLICY IF EXISTS "Users can view their game sessions" ON www_game_sessions;
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON www_game_sessions;
DROP POLICY IF EXISTS "Host can update their sessions" ON www_game_sessions;

DROP POLICY IF EXISTS "View participants in accessible sessions" ON www_game_participants;
DROP POLICY IF EXISTS "Users can join games" ON www_game_participants;
DROP POLICY IF EXISTS "Host can update participants" ON www_game_participants;
DROP POLICY IF EXISTS "Host can delete participants" ON www_game_participants;

-- Create security definer function to check session host
CREATE OR REPLACE FUNCTION public.is_www_session_host(_session_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM www_game_sessions
    WHERE id = _session_id AND host_user_id = _user_id
  )
$$;

-- Create security definer function to check if user is participant
CREATE OR REPLACE FUNCTION public.is_www_participant(_session_id uuid, _user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM www_game_participants
    WHERE session_id = _session_id AND user_id = _user_id
  )
$$;

-- Simple policies for www_game_sessions
CREATE POLICY "Anyone can view sessions"
ON www_game_sessions
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create sessions"
ON www_game_sessions
FOR INSERT
WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update sessions"
ON www_game_sessions
FOR UPDATE
USING (auth.uid() = host_user_id);

-- Simple policies for www_game_participants
CREATE POLICY "Anyone can view participants"
ON www_game_participants
FOR SELECT
USING (true);

CREATE POLICY "Users can insert participants"
ON www_game_participants
FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND is_bot = false)
  OR 
  (is_bot = true AND public.is_www_session_host(session_id))
);

CREATE POLICY "Host can update participants"
ON www_game_participants
FOR UPDATE
USING (public.is_www_session_host(session_id));

CREATE POLICY "Host can delete participants"
ON www_game_participants
FOR DELETE
USING (public.is_www_session_host(session_id));