-- Create friend_groups table for group chats
CREATE TABLE IF NOT EXISTS public.friend_groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_message_preview TEXT
);

-- Create friend_group_members table
CREATE TABLE IF NOT EXISTS public.friend_group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', -- 'admin' or 'member'
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create friend_group_messages table
CREATE TABLE IF NOT EXISTS public.friend_group_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.friend_groups(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  gif_id UUID REFERENCES public.gifs(id),
  reply_to_id UUID REFERENCES public.friend_group_messages(id),
  is_deleted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  edited_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_group_members_user ON public.friend_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_members_group ON public.friend_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_messages_group ON public.friend_group_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_friend_group_messages_created ON public.friend_group_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.friend_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_group_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for friend_groups
CREATE POLICY "Users can view groups they're members of"
  ON public.friend_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_groups.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create groups"
  ON public.friend_groups FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Group admins can update groups"
  ON public.friend_groups FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_groups.id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for friend_group_members
CREATE POLICY "Users can view group members"
  ON public.friend_group_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members m
      WHERE m.group_id = friend_group_members.group_id AND m.user_id = auth.uid()
    )
  );

CREATE POLICY "Group admins can add members"
  ON public.friend_group_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_members.group_id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
    OR friend_group_members.user_id = auth.uid()
  );

CREATE POLICY "Members can leave, admins can remove"
  ON public.friend_group_members FOR DELETE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_members.group_id 
      AND user_id = auth.uid() 
      AND role = 'admin'
    )
  );

-- RLS Policies for friend_group_messages
CREATE POLICY "Group members can view messages"
  ON public.friend_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_messages.group_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Group members can send messages"
  ON public.friend_group_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.friend_group_members
      WHERE group_id = friend_group_messages.group_id AND user_id = auth.uid()
    )
    AND sender_id = auth.uid()
  );

CREATE POLICY "Senders can update their messages"
  ON public.friend_group_messages FOR UPDATE
  USING (sender_id = auth.uid());

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_group_messages;