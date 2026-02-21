-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view game participants" ON www_game_participants;
DROP POLICY IF EXISTS "Session host can manage participants" ON www_game_participants;

-- Create simple, non-recursive policies
-- Anyone can view participants of sessions they're part of (via session check only)
CREATE POLICY "View participants in accessible sessions"
ON www_game_participants
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM www_game_sessions s
    WHERE s.id = www_game_participants.session_id
    AND (
      s.host_user_id = auth.uid() 
      OR s.status = 'waiting'
      OR s.status = 'in_progress'
    )
  )
);

-- Users can insert themselves as participants
CREATE POLICY "Users can join games"
ON www_game_participants
FOR INSERT
WITH CHECK (
  (user_id = auth.uid() AND is_bot = false)
  OR 
  (is_bot = true AND EXISTS (
    SELECT 1 FROM www_game_sessions s
    WHERE s.id = session_id AND s.host_user_id = auth.uid()
  ))
);

-- Host can update participants in their sessions
CREATE POLICY "Host can update participants"
ON www_game_participants
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM www_game_sessions s
    WHERE s.id = www_game_participants.session_id 
    AND s.host_user_id = auth.uid()
  )
);

-- Host can delete participants from their sessions
CREATE POLICY "Host can delete participants"
ON www_game_participants
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM www_game_sessions s
    WHERE s.id = www_game_participants.session_id 
    AND s.host_user_id = auth.uid()
  )
);