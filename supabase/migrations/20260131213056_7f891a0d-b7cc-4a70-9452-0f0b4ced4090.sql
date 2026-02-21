-- Add missing columns to friend_groups for enhanced features
ALTER TABLE public.friend_groups ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.friend_groups ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#3B82F6';
ALTER TABLE public.friend_groups ADD COLUMN IF NOT EXISTS custom_emoji TEXT DEFAULT '👍';
ALTER TABLE public.friend_groups ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
ALTER TABLE public.friend_groups ADD COLUMN IF NOT EXISTS require_approval BOOLEAN DEFAULT false;

-- Add audio columns to friend_group_messages
ALTER TABLE public.friend_group_messages ADD COLUMN IF NOT EXISTS audio_url TEXT;
ALTER TABLE public.friend_group_messages ADD COLUMN IF NOT EXISTS audio_duration INTEGER;
ALTER TABLE public.friend_group_messages ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE public.friend_group_messages ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.friend_group_messages ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Create join requests table for group approvals
CREATE TABLE IF NOT EXISTS public.friend_group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  reviewed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE public.friend_group_join_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for join requests
CREATE POLICY "Users can view their own join requests"
  ON public.friend_group_join_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Group admins can view join requests"
  ON public.friend_group_join_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_join_requests.group_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'creator')
    )
  );

CREATE POLICY "Users can create join requests"
  ON public.friend_group_join_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update join requests"
  ON public.friend_group_join_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_join_requests.group_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'creator')
    )
  );

-- Create polls table for group chats
CREATE TABLE IF NOT EXISTS public.friend_group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.friend_groups(id) ON DELETE CASCADE NOT NULL,
  created_by UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  is_anonymous BOOLEAN DEFAULT false,
  is_multiple_choice BOOLEAN DEFAULT false,
  expires_at TIMESTAMPTZ,
  is_closed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create poll votes table
CREATE TABLE IF NOT EXISTS public.friend_group_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES public.friend_group_polls(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- Enable RLS
ALTER TABLE public.friend_group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_poll_votes ENABLE ROW LEVEL SECURITY;

-- RLS for polls
CREATE POLICY "Group members can view polls"
  ON public.friend_group_polls FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_polls.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can create polls"
  ON public.friend_group_polls FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_polls.group_id
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Poll creator or admin can update"
  ON public.friend_group_polls FOR UPDATE
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_polls.group_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'creator')
    )
  );

-- RLS for poll votes
CREATE POLICY "Group members can vote"
  ON public.friend_group_poll_votes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.friend_group_members m
      JOIN public.friend_group_polls p ON p.group_id = m.group_id
      WHERE p.id = friend_group_poll_votes.poll_id
      AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "View votes in non-anonymous polls"
  ON public.friend_group_poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_polls p
      WHERE p.id = friend_group_poll_votes.poll_id
      AND (p.is_anonymous = false OR friend_group_poll_votes.user_id = auth.uid())
    )
  );

-- Create message reactions for group messages
CREATE TABLE IF NOT EXISTS public.friend_group_message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.friend_group_messages(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(message_id, user_id)
);

ALTER TABLE public.friend_group_message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group members can react"
  ON public.friend_group_message_reactions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_messages m
      JOIN public.friend_group_members mem ON mem.group_id = m.group_id
      WHERE m.id = friend_group_message_reactions.message_id
      AND mem.user_id = auth.uid()
    )
  );

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_join_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_message_reactions;