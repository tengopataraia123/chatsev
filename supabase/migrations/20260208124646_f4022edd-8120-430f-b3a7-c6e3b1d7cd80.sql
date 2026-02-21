-- =====================================================
-- Announcement Comments System with Reactions & Replies
-- =====================================================

-- 1. Create announcement_comments table
CREATE TABLE public.announcement_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_announcement_comments_announcement ON public.announcement_comments(announcement_id);
CREATE INDEX idx_announcement_comments_parent ON public.announcement_comments(parent_id);

-- Enable RLS
ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for announcement_comments
-- Anyone authenticated can read comments
CREATE POLICY "Anyone can view announcement comments"
ON public.announcement_comments
FOR SELECT
TO authenticated
USING (true);

-- Users can create their own comments
CREATE POLICY "Users can create own comments"
ON public.announcement_comments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update only their own comments
CREATE POLICY "Users can update own comments"
ON public.announcement_comments
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Users can delete their own comments, admins can delete any
CREATE POLICY "Users can delete own comments or admins any"
ON public.announcement_comments
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'moderator')
  )
);

-- 2. Create announcement_comment_reactions table
CREATE TABLE public.announcement_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.announcement_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id, reaction_type)
);

CREATE INDEX idx_ann_comment_reactions_comment ON public.announcement_comment_reactions(comment_id);

-- Enable RLS
ALTER TABLE public.announcement_comment_reactions ENABLE ROW LEVEL SECURITY;

-- RLS for reactions
CREATE POLICY "Anyone can view comment reactions"
ON public.announcement_comment_reactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can create own reactions"
ON public.announcement_comment_reactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reactions"
ON public.announcement_comment_reactions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 3. Add publish_as_system column to announcements
ALTER TABLE public.announcements 
ADD COLUMN IF NOT EXISTS publish_as_system BOOLEAN DEFAULT false;

-- 4. Update RLS for announcements to allow all super_admins (not just specific user)
-- First drop existing policies if they're too restrictive
DROP POLICY IF EXISTS "Super admins can manage announcements" ON public.announcements;

-- Create proper policy for all super_admins
CREATE POLICY "Super admins can manage announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- 5. Create function to get comments with user info and reactions
CREATE OR REPLACE FUNCTION public.get_announcement_comments(p_announcement_id UUID)
RETURNS TABLE (
  id UUID,
  announcement_id UUID,
  user_id UUID,
  parent_id UUID,
  content TEXT,
  is_edited BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  username TEXT,
  avatar_url TEXT,
  reactions_count BIGINT,
  user_reaction TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.announcement_id,
    c.user_id,
    c.parent_id,
    c.content,
    c.is_edited,
    c.created_at,
    c.updated_at,
    p.username,
    p.avatar_url,
    (SELECT COUNT(*) FROM announcement_comment_reactions r WHERE r.comment_id = c.id) as reactions_count,
    (SELECT r.reaction_type FROM announcement_comment_reactions r WHERE r.comment_id = c.id AND r.user_id = auth.uid() LIMIT 1) as user_reaction
  FROM announcement_comments c
  LEFT JOIN profiles p ON p.user_id = c.user_id
  WHERE c.announcement_id = p_announcement_id
  ORDER BY c.created_at ASC;
END;
$$;

-- 6. Enable realtime for comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_comment_reactions;