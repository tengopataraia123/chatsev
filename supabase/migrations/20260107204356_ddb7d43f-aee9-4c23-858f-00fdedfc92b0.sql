
-- =====================================================
-- SECURITY FIX: Comprehensive RLS and Validation Update
-- =====================================================

-- 1. ADD SERVER-SIDE INPUT VALIDATION (CHECK CONSTRAINTS)
-- =====================================================

-- Post comments length limit
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS check_content_length;
ALTER TABLE post_comments ADD CONSTRAINT check_content_length 
  CHECK (length(content) > 0 AND length(content) <= 5000);

-- Private messages length limit
ALTER TABLE private_messages DROP CONSTRAINT IF EXISTS check_message_length;
ALTER TABLE private_messages ADD CONSTRAINT check_message_length
  CHECK (content IS NULL OR length(content) <= 10000);

-- Posts content length limit
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_post_content_length;
ALTER TABLE posts ADD CONSTRAINT check_post_content_length
  CHECK (content IS NULL OR length(content) <= 5000);

-- Group chat messages length limit
ALTER TABLE group_chat_messages DROP CONSTRAINT IF EXISTS check_gcm_content_length;
ALTER TABLE group_chat_messages ADD CONSTRAINT check_gcm_content_length
  CHECK (content IS NULL OR length(content) <= 5000);

-- Forum posts length limit
ALTER TABLE forum_posts DROP CONSTRAINT IF EXISTS check_forum_content_length;
ALTER TABLE forum_posts ADD CONSTRAINT check_forum_content_length
  CHECK (length(content) > 0 AND length(content) <= 10000);

-- Blog content length limit
ALTER TABLE blogs DROP CONSTRAINT IF EXISTS check_blog_content_length;
ALTER TABLE blogs ADD CONSTRAINT check_blog_content_length
  CHECK (length(content) > 0 AND length(content) <= 50000);

-- Story comments length limit
ALTER TABLE story_comments DROP CONSTRAINT IF EXISTS check_story_comment_length;
ALTER TABLE story_comments ADD CONSTRAINT check_story_comment_length
  CHECK (length(content) > 0 AND length(content) <= 1000);

-- Reel comments length limit
ALTER TABLE reel_comments DROP CONSTRAINT IF EXISTS check_reel_comment_length;
ALTER TABLE reel_comments ADD CONSTRAINT check_reel_comment_length
  CHECK (length(content) > 0 AND length(content) <= 1000);

-- Live comments length limit
ALTER TABLE live_comments DROP CONSTRAINT IF EXISTS check_live_comment_length;
ALTER TABLE live_comments ADD CONSTRAINT check_live_comment_length
  CHECK (length(content) > 0 AND length(content) <= 500);

-- Reports reason length limit
ALTER TABLE reports DROP CONSTRAINT IF EXISTS check_report_reason_length;
ALTER TABLE reports ADD CONSTRAINT check_report_reason_length
  CHECK (length(reason_text) > 0 AND length(reason_text) <= 2000);

-- 2. FIX PROFILES TABLE - Respect privacy settings
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles based on privacy" ON profiles;

-- Users can always see their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Users can see other profiles based on privacy settings
CREATE POLICY "Users can view others profiles based on privacy"
ON profiles FOR SELECT
TO authenticated
USING (
  -- Check privacy settings
  EXISTS (
    SELECT 1 FROM privacy_settings ps
    WHERE ps.user_id = profiles.user_id
    AND (
      ps.profile_visibility = 'public'
      OR (ps.profile_visibility = 'friends' AND EXISTS (
        SELECT 1 FROM friendships f
        WHERE f.status = 'accepted'
        AND ((f.requester_id = auth.uid() AND f.addressee_id = profiles.user_id)
          OR (f.addressee_id = auth.uid() AND f.requester_id = profiles.user_id))
      ))
    )
  )
  -- Or if no privacy settings exist (default to visible for backwards compatibility)
  OR NOT EXISTS (SELECT 1 FROM privacy_settings WHERE user_id = profiles.user_id)
);

-- 3. FIX PRIVATE MESSAGES - Enforce deletion flags
-- =====================================================

DROP POLICY IF EXISTS "Users can view their conversation messages" ON private_messages;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON private_messages;

CREATE POLICY "Users can view their conversation messages with deletion"
ON private_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = private_messages.conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
  AND (
    -- If user is sender, check deleted_for_sender
    (sender_id = auth.uid() AND (deleted_for_sender IS NULL OR deleted_for_sender = false))
    OR
    -- If user is receiver, check deleted_for_receiver  
    (sender_id != auth.uid() AND (deleted_for_receiver IS NULL OR deleted_for_receiver = false))
  )
  AND (is_deleted IS NULL OR is_deleted = false)
);

-- 4. FIX DATING PROFILES - Only visible to active dating users
-- =====================================================

DROP POLICY IF EXISTS "Active dating profiles are viewable" ON dating_profiles;
DROP POLICY IF EXISTS "Anyone can view active dating profiles" ON dating_profiles;

-- Users can view their own dating profile
CREATE POLICY "Users can view own dating profile"
ON dating_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users with active dating profiles can see other active profiles
CREATE POLICY "Active dating users can view other active profiles"
ON dating_profiles FOR SELECT
TO authenticated
USING (
  is_active = true
  AND EXISTS (
    SELECT 1 FROM dating_profiles dp
    WHERE dp.user_id = auth.uid()
    AND dp.is_active = true
  )
);

-- 5. FIX PROFILE VISITS - Only profile owner can see visitors
-- =====================================================

DROP POLICY IF EXISTS "Profile owners can view their visitors" ON profile_visits;
DROP POLICY IF EXISTS "Users can view visitors to their profile" ON profile_visits;

CREATE POLICY "Profile owners can view recent visitors"
ON profile_visits FOR SELECT
TO authenticated
USING (
  profile_user_id = auth.uid()
  -- Only show visits from last 30 days
  AND visited_at > NOW() - INTERVAL '30 days'
);

-- Users can still insert visits
DROP POLICY IF EXISTS "Users can record profile visits" ON profile_visits;
CREATE POLICY "Users can record profile visits"
ON profile_visits FOR INSERT
TO authenticated
WITH CHECK (visitor_user_id = auth.uid());

-- 6. FIX FOLLOWERS/FRIENDSHIPS - Require authentication
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view followers" ON followers;
DROP POLICY IF EXISTS "Followers are viewable by everyone" ON followers;

CREATE POLICY "Authenticated users can view followers"
ON followers FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can view friendships" ON friendships;
DROP POLICY IF EXISTS "Friendships are viewable by everyone" ON friendships;

CREATE POLICY "Authenticated users can view friendships"
ON friendships FOR SELECT
TO authenticated
USING (true);

-- 7. FIX GAME DATA - Restrict visibility
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view game history" ON game_history;
DROP POLICY IF EXISTS "Game history is viewable by everyone" ON game_history;

CREATE POLICY "Users can view own game history"
ON game_history FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Anyone can view game stats" ON game_stats;
DROP POLICY IF EXISTS "Game stats are viewable by everyone" ON game_stats;

CREATE POLICY "Users can view own game stats"
ON game_stats FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Game rooms - participants only
DROP POLICY IF EXISTS "Anyone can view game rooms" ON game_rooms;
DROP POLICY IF EXISTS "Game rooms are viewable by everyone" ON game_rooms;

CREATE POLICY "Participants can view game rooms"
ON game_rooms FOR SELECT
TO authenticated
USING (
  host_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM game_room_players grp
    WHERE grp.room_id = game_rooms.id
    AND grp.user_id = auth.uid()
  )
  -- Allow viewing open/waiting rooms for joining
  OR status = 'waiting'
);

-- 8. FIX CONTENT VISIBILITY - Require authentication
-- =====================================================

-- Posts
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON posts;

CREATE POLICY "Authenticated users can view approved posts"
ON posts FOR SELECT
TO authenticated
USING (is_approved = true OR is_approved IS NULL OR user_id = auth.uid());

-- Stories
DROP POLICY IF EXISTS "Anyone can view stories" ON stories;
DROP POLICY IF EXISTS "Stories are viewable by everyone" ON stories;

CREATE POLICY "Authenticated users can view active stories"
ON stories FOR SELECT
TO authenticated
USING (expires_at > NOW() OR user_id = auth.uid());

-- Reels
DROP POLICY IF EXISTS "Anyone can view reels" ON reels;
DROP POLICY IF EXISTS "Reels are viewable by everyone" ON reels;

CREATE POLICY "Authenticated users can view reels"
ON reels FOR SELECT
TO authenticated
USING (true);

-- Blogs
DROP POLICY IF EXISTS "Anyone can view blogs" ON blogs;
DROP POLICY IF EXISTS "Blogs are viewable by everyone" ON blogs;

CREATE POLICY "Authenticated users can view blogs"
ON blogs FOR SELECT
TO authenticated
USING (true);

-- 9. FIX LIVE STREAMING - Restrict to participants
-- =====================================================

DROP POLICY IF EXISTS "Anyone can view live streams" ON live_streams;
DROP POLICY IF EXISTS "Live streams are viewable by everyone" ON live_streams;

CREATE POLICY "Authenticated users can view active live streams"
ON live_streams FOR SELECT
TO authenticated
USING (status = 'live' OR status = 'waiting' OR host_id = auth.uid());

-- Live participants
DROP POLICY IF EXISTS "Anyone can view live participants" ON live_participants;

CREATE POLICY "Authenticated users can view live participants"
ON live_participants FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM live_streams ls
    WHERE ls.id = live_participants.live_id
    AND (ls.status = 'live' OR ls.status = 'waiting' OR ls.host_id = auth.uid())
  )
);

-- Live viewers - only host can see all
DROP POLICY IF EXISTS "Anyone can view live viewers" ON live_viewers;

CREATE POLICY "Host can view all viewers"
ON live_viewers FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM live_streams ls
    WHERE ls.id = live_viewers.live_id
    AND ls.host_id = auth.uid()
  )
);

-- Live comments
DROP POLICY IF EXISTS "Anyone can view live comments" ON live_comments;

CREATE POLICY "Authenticated users can view live comments"
ON live_comments FOR SELECT
TO authenticated
USING (is_deleted = false);

-- 10. FIX GROUP CHAT - Restrict to actual group members (for future groups feature)
-- For now, group_chat is a public room, so authenticated users can see public messages
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can view public messages" ON group_chat_messages;

CREATE POLICY "Authenticated users can view group messages"
ON group_chat_messages FOR SELECT
TO authenticated
USING (
  -- Public messages visible to all authenticated
  (is_private = false OR is_private IS NULL)
  -- Private messages only to sender and recipient
  OR user_id = auth.uid()
  OR private_to_user_id = auth.uid()
);
