-- =====================================================
-- FULL MESSENGER SYSTEM - Facebook Messenger Style
-- =====================================================

-- Chat themes enum (if not exists)
DO $$ BEGIN
  CREATE TYPE chat_theme AS ENUM (
    'default', 'love', 'tie_dye', 'berry', 'candy', 'citrus', 
    'tropical', 'forest', 'ocean', 'lavender', 'rose', 'sunset'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Message status enum (if not exists)
DO $$ BEGIN
  CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- 1. MESSENGER CONVERSATIONS (1:1 chats with settings)
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL,
  user2_id UUID NOT NULL,
  theme chat_theme DEFAULT 'default',
  custom_emoji TEXT DEFAULT '❤️',
  user1_nickname TEXT,
  user2_nickname TEXT,
  vanish_mode_enabled BOOLEAN DEFAULT false,
  vanish_mode_timeout_hours INTEGER DEFAULT 24,
  encryption_enabled BOOLEAN DEFAULT true,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user1_id, user2_id)
);

-- =====================================================
-- 2. MESSENGER MESSAGES (with all features)
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  image_urls TEXT[],
  video_url TEXT,
  voice_url TEXT,
  voice_duration_seconds INTEGER,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  gif_id UUID REFERENCES gifs(id),
  sticker_id UUID,
  reply_to_id UUID REFERENCES messenger_messages(id) ON DELETE SET NULL,
  status message_status DEFAULT 'sent',
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_for_everyone BOOLEAN DEFAULT false,
  is_vanishing BOOLEAN DEFAULT false,
  vanishes_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 3. MESSAGE REACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messenger_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- =====================================================
-- 4. TYPING INDICATORS
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_typing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES messenger_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- =====================================================
-- 5. READ RECEIPTS PREFERENCES
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  show_read_receipts BOOLEAN DEFAULT true,
  show_typing_indicator BOOLEAN DEFAULT true,
  notification_sounds BOOLEAN DEFAULT true,
  notification_previews BOOLEAN DEFAULT true,
  auto_play_videos BOOLEAN DEFAULT true,
  auto_play_gifs BOOLEAN DEFAULT true,
  hd_media_wifi_only BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 6. GROUP CHATS
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  creator_id UUID NOT NULL,
  theme chat_theme DEFAULT 'default',
  custom_emoji TEXT DEFAULT '❤️',
  is_private BOOLEAN DEFAULT false,
  join_approval_required BOOLEAN DEFAULT false,
  vanish_mode_enabled BOOLEAN DEFAULT false,
  encryption_enabled BOOLEAN DEFAULT true,
  max_members INTEGER DEFAULT 250,
  member_count INTEGER DEFAULT 1,
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_sender_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 7. GROUP MEMBERS (using existing group_member_role type)
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role group_member_role DEFAULT 'member',
  nickname TEXT,
  can_send_messages BOOLEAN DEFAULT true,
  can_send_media BOOLEAN DEFAULT true,
  can_add_members BOOLEAN DEFAULT true,
  is_muted BOOLEAN DEFAULT false,
  muted_until TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  invited_by UUID,
  UNIQUE(group_id, user_id)
);

-- =====================================================
-- 8. GROUP MESSAGES
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  image_urls TEXT[],
  video_url TEXT,
  voice_url TEXT,
  voice_duration_seconds INTEGER,
  file_url TEXT,
  file_name TEXT,
  file_size_bytes BIGINT,
  gif_id UUID REFERENCES gifs(id),
  sticker_id UUID,
  reply_to_id UUID REFERENCES messenger_group_messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMPTZ,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  is_vanishing BOOLEAN DEFAULT false,
  vanishes_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 9. GROUP MESSAGE REACTIONS
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messenger_group_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- =====================================================
-- 10. GROUP MESSAGE READ STATUS
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  last_read_message_id UUID REFERENCES messenger_group_messages(id) ON DELETE SET NULL,
  last_read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- =====================================================
-- 11. GROUP POLLS
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL,
  is_anonymous BOOLEAN DEFAULT false,
  is_multiple_choice BOOLEAN DEFAULT false,
  ends_at TIMESTAMPTZ,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =====================================================
-- 12. GROUP POLL VOTES
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES messenger_group_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id)
);

-- =====================================================
-- 13. GROUP JOIN REQUESTS
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- =====================================================
-- 14. GROUP TYPING
-- =====================================================
CREATE TABLE IF NOT EXISTS messenger_group_typing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_messenger_conv_users ON messenger_conversations(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messenger_conv_last_msg ON messenger_conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_conv ON messenger_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messenger_messages_sender ON messenger_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messenger_reactions_msg ON messenger_reactions(message_id);
CREATE INDEX IF NOT EXISTS idx_messenger_group_messages ON messenger_group_messages(group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messenger_group_members ON messenger_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_messenger_group_user ON messenger_group_members(user_id);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE messenger_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_typing ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE messenger_group_typing ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - CONVERSATIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can view own conversations" ON messenger_conversations;
CREATE POLICY "Users can view own conversations"
  ON messenger_conversations FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can create conversations" ON messenger_conversations;
CREATE POLICY "Users can create conversations"
  ON messenger_conversations FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON messenger_conversations;
CREATE POLICY "Users can update own conversations"
  ON messenger_conversations FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- =====================================================
-- RLS POLICIES - MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messenger_messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messenger_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can send messages" ON messenger_messages;
CREATE POLICY "Users can send messages"
  ON messenger_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM messenger_conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own messages" ON messenger_messages;
CREATE POLICY "Users can update own messages"
  ON messenger_messages FOR UPDATE
  USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON messenger_messages;
CREATE POLICY "Users can delete own messages"
  ON messenger_messages FOR DELETE
  USING (auth.uid() = sender_id);

-- =====================================================
-- RLS POLICIES - REACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Users can view reactions" ON messenger_reactions;
CREATE POLICY "Users can view reactions"
  ON messenger_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_messages m
      JOIN messenger_conversations c ON c.id = m.conversation_id
      WHERE m.id = message_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can add reactions" ON messenger_reactions;
CREATE POLICY "Users can add reactions"
  ON messenger_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own reactions" ON messenger_reactions;
CREATE POLICY "Users can remove own reactions"
  ON messenger_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - TYPING
-- =====================================================
DROP POLICY IF EXISTS "Users can see typing in their convos" ON messenger_typing;
CREATE POLICY "Users can see typing in their convos"
  ON messenger_typing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_conversations c
      WHERE c.id = conversation_id
      AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can update own typing" ON messenger_typing;
CREATE POLICY "Users can update own typing"
  ON messenger_typing FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - PREFERENCES
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own preferences" ON messenger_preferences;
CREATE POLICY "Users can manage own preferences"
  ON messenger_preferences FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - GROUPS
-- =====================================================
DROP POLICY IF EXISTS "Members can view groups" ON messenger_groups;
CREATE POLICY "Members can view groups"
  ON messenger_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = id AND m.user_id = auth.uid()
    )
    OR is_private = false
  );

DROP POLICY IF EXISTS "Users can create groups" ON messenger_groups;
CREATE POLICY "Users can create groups"
  ON messenger_groups FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Admins can update groups" ON messenger_groups;
CREATE POLICY "Admins can update groups"
  ON messenger_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- RLS POLICIES - GROUP MEMBERS
-- =====================================================
DROP POLICY IF EXISTS "Members can view group members" ON messenger_group_members;
CREATE POLICY "Members can view group members"
  ON messenger_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can manage members" ON messenger_group_members;
CREATE POLICY "Admins can manage members"
  ON messenger_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('admin', 'moderator')
    )
    OR auth.uid() = user_id
  );

-- =====================================================
-- RLS POLICIES - GROUP MESSAGES
-- =====================================================
DROP POLICY IF EXISTS "Members can view group messages" ON messenger_group_messages;
CREATE POLICY "Members can view group messages"
  ON messenger_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can send group messages" ON messenger_group_messages;
CREATE POLICY "Members can send group messages"
  ON messenger_group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id 
      AND m.user_id = auth.uid()
      AND m.can_send_messages = true
    )
  );

DROP POLICY IF EXISTS "Users can update own group messages" ON messenger_group_messages;
CREATE POLICY "Users can update own group messages"
  ON messenger_group_messages FOR UPDATE
  USING (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Users can delete own group messages" ON messenger_group_messages;
CREATE POLICY "Users can delete own group messages"
  ON messenger_group_messages FOR DELETE
  USING (
    auth.uid() = sender_id OR
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- RLS POLICIES - GROUP REACTIONS
-- =====================================================
DROP POLICY IF EXISTS "Members can view group reactions" ON messenger_group_reactions;
CREATE POLICY "Members can view group reactions"
  ON messenger_group_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_messages gm
      JOIN messenger_group_members m ON m.group_id = gm.group_id
      WHERE gm.id = message_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can add group reactions" ON messenger_group_reactions;
CREATE POLICY "Members can add group reactions"
  ON messenger_group_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can remove own group reactions" ON messenger_group_reactions;
CREATE POLICY "Users can remove own group reactions"
  ON messenger_group_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - GROUP READS
-- =====================================================
DROP POLICY IF EXISTS "Users can manage own read status" ON messenger_group_reads;
CREATE POLICY "Users can manage own read status"
  ON messenger_group_reads FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - GROUP POLLS
-- =====================================================
DROP POLICY IF EXISTS "Members can view polls" ON messenger_group_polls;
CREATE POLICY "Members can view polls"
  ON messenger_group_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can create polls" ON messenger_group_polls;
CREATE POLICY "Members can create polls"
  ON messenger_group_polls FOR INSERT
  WITH CHECK (
    auth.uid() = creator_id AND
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Creators can update polls" ON messenger_group_polls;
CREATE POLICY "Creators can update polls"
  ON messenger_group_polls FOR UPDATE
  USING (auth.uid() = creator_id);

-- =====================================================
-- RLS POLICIES - GROUP POLL VOTES
-- =====================================================
DROP POLICY IF EXISTS "Members can view votes" ON messenger_group_poll_votes;
CREATE POLICY "Members can view votes"
  ON messenger_group_poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_polls p
      JOIN messenger_group_members m ON m.group_id = p.group_id
      WHERE p.id = poll_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can vote" ON messenger_group_poll_votes;
CREATE POLICY "Members can vote"
  ON messenger_group_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can change own vote" ON messenger_group_poll_votes;
CREATE POLICY "Users can change own vote"
  ON messenger_group_poll_votes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- RLS POLICIES - GROUP REQUESTS
-- =====================================================
DROP POLICY IF EXISTS "Admins can view requests" ON messenger_group_requests;
CREATE POLICY "Admins can view requests"
  ON messenger_group_requests FOR SELECT
  USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('admin', 'moderator')
    )
  );

DROP POLICY IF EXISTS "Users can request to join" ON messenger_group_requests;
CREATE POLICY "Users can request to join"
  ON messenger_group_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update requests" ON messenger_group_requests;
CREATE POLICY "Admins can update requests"
  ON messenger_group_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id 
      AND m.user_id = auth.uid() 
      AND m.role IN ('admin', 'moderator')
    )
  );

-- =====================================================
-- RLS POLICIES - GROUP TYPING
-- =====================================================
DROP POLICY IF EXISTS "Members can see group typing" ON messenger_group_typing;
CREATE POLICY "Members can see group typing"
  ON messenger_group_typing FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messenger_group_members m
      WHERE m.group_id = group_id AND m.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own group typing" ON messenger_group_typing;
CREATE POLICY "Users can update own group typing"
  ON messenger_group_typing FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- ENABLE REALTIME
-- =====================================================
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_group_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_group_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_group_typing;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_group_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE messenger_group_poll_votes;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION get_or_create_messenger_conversation(other_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id UUID;
  v_user1 UUID;
  v_user2 UUID;
BEGIN
  IF auth.uid() < other_user_id THEN
    v_user1 := auth.uid();
    v_user2 := other_user_id;
  ELSE
    v_user1 := other_user_id;
    v_user2 := auth.uid();
  END IF;
  
  SELECT id INTO v_conv_id
  FROM messenger_conversations
  WHERE user1_id = v_user1 AND user2_id = v_user2;
  
  IF v_conv_id IS NULL THEN
    INSERT INTO messenger_conversations (user1_id, user2_id)
    VALUES (v_user1, v_user2)
    RETURNING id INTO v_conv_id;
  END IF;
  
  RETURN v_conv_id;
END;
$$;

-- Update conversation last message
CREATE OR REPLACE FUNCTION update_messenger_conv_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messenger_conversations
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(COALESCE(NEW.content, 
      CASE 
        WHEN NEW.image_urls IS NOT NULL THEN '📷 ფოტო'
        WHEN NEW.video_url IS NOT NULL THEN '🎥 ვიდეო'
        WHEN NEW.voice_url IS NOT NULL THEN '🎤 ხმოვანი'
        WHEN NEW.file_url IS NOT NULL THEN '📎 ფაილი'
        WHEN NEW.gif_id IS NOT NULL THEN 'GIF'
        ELSE ''
      END
    ), 100),
    updated_at = now()
  WHERE id = NEW.conversation_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messenger_conv_last_message ON messenger_messages;
CREATE TRIGGER trg_messenger_conv_last_message
AFTER INSERT ON messenger_messages
FOR EACH ROW
EXECUTE FUNCTION update_messenger_conv_last_message();

-- Update group last message
CREATE OR REPLACE FUNCTION update_messenger_group_last_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE messenger_groups
  SET 
    last_message_at = NEW.created_at,
    last_message_preview = LEFT(COALESCE(NEW.content, 
      CASE 
        WHEN NEW.image_urls IS NOT NULL THEN '📷 ფოტო'
        WHEN NEW.video_url IS NOT NULL THEN '🎥 ვიდეო'
        WHEN NEW.voice_url IS NOT NULL THEN '🎤 ხმოვანი'
        WHEN NEW.file_url IS NOT NULL THEN '📎 ფაილი'
        WHEN NEW.gif_id IS NOT NULL THEN 'GIF'
        ELSE ''
      END
    ), 100),
    last_message_sender_id = NEW.sender_id,
    updated_at = now()
  WHERE id = NEW.group_id;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messenger_group_last_message ON messenger_group_messages;
CREATE TRIGGER trg_messenger_group_last_message
AFTER INSERT ON messenger_group_messages
FOR EACH ROW
EXECUTE FUNCTION update_messenger_group_last_message();

-- Auto-add creator as admin when group is created
CREATE OR REPLACE FUNCTION add_messenger_group_creator_as_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO messenger_group_members (group_id, user_id, role)
  VALUES (NEW.id, NEW.creator_id, 'admin');
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_messenger_add_group_creator ON messenger_groups;
CREATE TRIGGER trg_messenger_add_group_creator
AFTER INSERT ON messenger_groups
FOR EACH ROW
EXECUTE FUNCTION add_messenger_group_creator_as_admin();

-- Update group member count
CREATE OR REPLACE FUNCTION update_messenger_group_member_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE messenger_groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE messenger_groups SET member_count = GREATEST(0, member_count - 1) WHERE id = OLD.group_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_messenger_member_count ON messenger_group_members;
CREATE TRIGGER trg_messenger_member_count
AFTER INSERT OR DELETE ON messenger_group_members
FOR EACH ROW
EXECUTE FUNCTION update_messenger_group_member_count();