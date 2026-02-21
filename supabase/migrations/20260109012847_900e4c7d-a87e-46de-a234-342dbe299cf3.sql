-- ================================================================
-- FACEBOOK-STYLE GROUPS SYSTEM - FULL DATABASE MIGRATION
-- ================================================================

-- First, drop all existing conflicting policies
DROP POLICY IF EXISTS "Members can create posts" ON public.group_posts;
DROP POLICY IF EXISTS "Group posts are viewable by group members" ON public.group_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON public.group_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.group_posts;
DROP POLICY IF EXISTS "Group members can create posts" ON public.group_posts;
DROP POLICY IF EXISTS "Anyone can view group posts" ON public.group_posts;
DROP POLICY IF EXISTS "Group members can view posts" ON public.group_posts;

DROP POLICY IF EXISTS "Group members are viewable by group members" ON public.group_members;
DROP POLICY IF EXISTS "Users can join groups" ON public.group_members;
DROP POLICY IF EXISTS "Users can leave groups" ON public.group_members;
DROP POLICY IF EXISTS "Anyone can view group members" ON public.group_members;

DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;
DROP POLICY IF EXISTS "Users can view groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Group owners can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Group owners can delete their groups" ON public.groups;
DROP POLICY IF EXISTS "Anyone can view groups" ON public.groups;

-- ================================================================
-- 1. Create enum types if not exist
-- ================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_visibility') THEN
    CREATE TYPE group_visibility AS ENUM ('public', 'closed', 'private');
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'group_member_role') THEN
    CREATE TYPE group_member_role AS ENUM ('owner', 'admin', 'moderator', 'member');
  END IF;
END $$;

-- ================================================================
-- 2. Update groups table with new columns
-- ================================================================

ALTER TABLE public.groups 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public',
ADD COLUMN IF NOT EXISTS rules TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS require_post_approval BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_member_posts BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Migrate is_private to visibility
UPDATE public.groups SET visibility = 'private' WHERE is_private = true;
UPDATE public.groups SET visibility = 'public' WHERE is_private = false OR is_private IS NULL;

-- ================================================================
-- 3. Update group_members table  
-- ================================================================

ALTER TABLE public.group_members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS invited_by UUID,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- ================================================================
-- 4. Update group_posts table with more features
-- ================================================================

ALTER TABLE public.group_posts
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS poll_id UUID,
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- ================================================================
-- 5. Create group join requests table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_join_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- ================================================================
-- 6. Create group invites table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  invited_by UUID NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(group_id, user_id)
);

-- ================================================================
-- 7. Create group post comments table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_comment_id UUID REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  gif_id UUID REFERENCES public.gifs(id),
  image_url TEXT,
  is_edited BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- 8. Create group post reactions table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_post_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- ================================================================
-- 9. Create group comment reactions table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_comment_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- ================================================================
-- 10. Create group files table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- 11. Create group events table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  location TEXT,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  is_online BOOLEAN DEFAULT false,
  online_link TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- 12. Create group event attendees table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_event_attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.group_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  status TEXT DEFAULT 'going',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- ================================================================
-- 13. Create group media table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.group_posts(id) ON DELETE SET NULL,
  user_id UUID NOT NULL,
  media_type TEXT NOT NULL,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- 14. Create group banned members table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_banned_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  banned_by UUID NOT NULL,
  reason TEXT,
  banned_until TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- ================================================================
-- 15. Create group notifications table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  from_user_id UUID NOT NULL,
  type TEXT NOT NULL,
  content_id UUID,
  content_type TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- 16. Create group polls table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  allow_multiple BOOLEAN DEFAULT false,
  ends_at TIMESTAMP WITH TIME ZONE,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ================================================================
-- 17. Create group poll votes table
-- ================================================================

CREATE TABLE IF NOT EXISTS public.group_poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.group_polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(poll_id, user_id, option_index)
);

-- ================================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================================

ALTER TABLE public.group_join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_event_attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_banned_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_poll_votes ENABLE ROW LEVEL SECURITY;

-- ================================================================
-- HELPER FUNCTIONS
-- ================================================================

CREATE OR REPLACE FUNCTION public.is_group_member(_group_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id 
    AND user_id = _user_id 
    AND status = 'active'
    AND role IN ('owner', 'admin', 'moderator')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups
    WHERE id = _group_id AND owner_id = _user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_group(_group_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id
    AND (
      g.visibility = 'public'
      OR g.visibility = 'closed'
      OR (g.visibility = 'private' AND public.is_group_member(_group_id, _user_id))
      OR public.has_role(_user_id, 'admin')
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_group_content(_group_id UUID, _user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.groups g
    WHERE g.id = _group_id
    AND (
      g.visibility = 'public'
      OR public.is_group_member(_group_id, _user_id)
      OR public.has_role(_user_id, 'admin')
    )
  );
$$;

-- ================================================================
-- RLS POLICIES FOR GROUPS
-- ================================================================

CREATE POLICY "grp_select" ON public.groups
  FOR SELECT USING (
    visibility IN ('public', 'closed') 
    OR public.is_group_member(id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "grp_insert" ON public.groups
  FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());

CREATE POLICY "grp_update" ON public.groups
  FOR UPDATE TO authenticated USING (
    public.is_group_admin(id, auth.uid()) OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "grp_delete" ON public.groups
  FOR DELETE TO authenticated USING (
    owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
  );

-- ================================================================
-- RLS POLICIES FOR GROUP MEMBERS
-- ================================================================

CREATE POLICY "gm_select" ON public.group_members
  FOR SELECT USING (public.can_view_group(group_id, auth.uid()));

CREATE POLICY "gm_insert" ON public.group_members
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.groups WHERE id = group_id AND visibility = 'public')
      OR public.is_group_admin(group_id, auth.uid())
    )
  );

CREATE POLICY "gm_delete" ON public.group_members
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() 
    OR public.is_group_admin(group_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "gm_update" ON public.group_members
  FOR UPDATE TO authenticated USING (
    public.is_group_admin(group_id, auth.uid()) 
    OR public.has_role(auth.uid(), 'admin')
  );

-- ================================================================
-- RLS POLICIES FOR GROUP POSTS
-- ================================================================

CREATE POLICY "gp_select" ON public.group_posts
  FOR SELECT USING (
    (is_approved = true AND public.can_view_group_content(group_id, auth.uid()))
    OR user_id = auth.uid()
    OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gp_insert" ON public.group_posts
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND public.is_group_member(group_id, auth.uid())
  );

CREATE POLICY "gp_update" ON public.group_posts
  FOR UPDATE TO authenticated USING (
    user_id = auth.uid() 
    OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gp_delete" ON public.group_posts
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() 
    OR public.is_group_admin(group_id, auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

-- ================================================================
-- RLS POLICIES FOR ALL OTHER TABLES
-- ================================================================

-- Join requests
CREATE POLICY "gjr_select" ON public.group_join_requests
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gjr_insert" ON public.group_join_requests
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "gjr_update" ON public.group_join_requests
  FOR UPDATE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));

CREATE POLICY "gjr_delete" ON public.group_join_requests
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid())
  );

-- Invites
CREATE POLICY "gi_select" ON public.group_invites
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR invited_by = auth.uid() OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "gi_insert" ON public.group_invites
  FOR INSERT TO authenticated WITH CHECK (
    public.is_group_member(group_id, auth.uid()) AND invited_by = auth.uid()
  );

CREATE POLICY "gi_update" ON public.group_invites
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "gi_delete" ON public.group_invites
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR invited_by = auth.uid() OR public.is_group_admin(group_id, auth.uid())
  );

-- Comments
CREATE POLICY "gpc_select" ON public.group_post_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_posts gp
      WHERE gp.id = post_id AND public.can_view_group_content(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "gpc_insert" ON public.group_post_comments
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.group_posts gp
      WHERE gp.id = post_id AND public.is_group_member(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "gpc_update" ON public.group_post_comments
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "gpc_delete" ON public.group_post_comments
  FOR DELETE TO authenticated USING (
    user_id = auth.uid() OR EXISTS (
      SELECT 1 FROM public.group_posts gp
      WHERE gp.id = post_id AND public.is_group_admin(gp.group_id, auth.uid())
    )
  );

-- Post reactions
CREATE POLICY "gpr_select" ON public.group_post_reactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_posts gp
      WHERE gp.id = post_id AND public.can_view_group_content(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "gpr_insert" ON public.group_post_reactions
  FOR INSERT TO authenticated WITH CHECK (
    user_id = auth.uid() AND EXISTS (
      SELECT 1 FROM public.group_posts gp
      WHERE gp.id = post_id AND public.is_group_member(gp.group_id, auth.uid())
    )
  );

CREATE POLICY "gpr_delete" ON public.group_post_reactions
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Comment reactions
CREATE POLICY "gcr_select" ON public.group_comment_reactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "gcr_insert" ON public.group_comment_reactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "gcr_delete" ON public.group_comment_reactions FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Files
CREATE POLICY "gf_select" ON public.group_files FOR SELECT USING (public.can_view_group_content(group_id, auth.uid()));
CREATE POLICY "gf_insert" ON public.group_files FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "gf_delete" ON public.group_files FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- Events
CREATE POLICY "ge_select" ON public.group_events FOR SELECT USING (public.can_view_group_content(group_id, auth.uid()));
CREATE POLICY "ge_insert" ON public.group_events FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "ge_update" ON public.group_events FOR UPDATE TO authenticated USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "ge_delete" ON public.group_events FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- Event attendees
CREATE POLICY "gea_select" ON public.group_event_attendees FOR SELECT TO authenticated USING (true);
CREATE POLICY "gea_insert" ON public.group_event_attendees FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "gea_update" ON public.group_event_attendees FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "gea_delete" ON public.group_event_attendees FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Media
CREATE POLICY "gmed_select" ON public.group_media FOR SELECT USING (public.can_view_group_content(group_id, auth.uid()));
CREATE POLICY "gmed_insert" ON public.group_media FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "gmed_delete" ON public.group_media FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- Banned members
CREATE POLICY "gbm_select" ON public.group_banned_members FOR SELECT TO authenticated USING (public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "gbm_insert" ON public.group_banned_members FOR INSERT TO authenticated WITH CHECK (public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "gbm_update" ON public.group_banned_members FOR UPDATE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));
CREATE POLICY "gbm_delete" ON public.group_banned_members FOR DELETE TO authenticated USING (public.is_group_admin(group_id, auth.uid()));

-- Notifications
CREATE POLICY "gn_select" ON public.group_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "gn_insert" ON public.group_notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "gn_update" ON public.group_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "gn_delete" ON public.group_notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Polls
CREATE POLICY "gpoll_select" ON public.group_polls FOR SELECT USING (public.can_view_group_content(group_id, auth.uid()));
CREATE POLICY "gpoll_insert" ON public.group_polls FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND public.is_group_member(group_id, auth.uid()));
CREATE POLICY "gpoll_update" ON public.group_polls FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "gpoll_delete" ON public.group_polls FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.is_group_admin(group_id, auth.uid()));

-- Poll votes
CREATE POLICY "gpv_select" ON public.group_poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "gpv_insert" ON public.group_poll_votes FOR INSERT TO authenticated WITH CHECK (
  user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.group_polls gp WHERE gp.id = poll_id AND public.is_group_member(gp.group_id, auth.uid())
  )
);
CREATE POLICY "gpv_delete" ON public.group_poll_votes FOR DELETE TO authenticated USING (user_id = auth.uid());

-- ================================================================
-- INDEXES FOR PERFORMANCE
-- ================================================================

CREATE INDEX IF NOT EXISTS idx_grp_members_group_user ON public.group_members(group_id, user_id);
CREATE INDEX IF NOT EXISTS idx_grp_posts_group ON public.group_posts(group_id);
CREATE INDEX IF NOT EXISTS idx_grp_posts_approved ON public.group_posts(group_id, is_approved);
CREATE INDEX IF NOT EXISTS idx_grp_comments_post ON public.group_post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_grp_reactions_post ON public.group_post_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_grp_notifications_user ON public.group_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_grp_events_group ON public.group_events(group_id);
CREATE INDEX IF NOT EXISTS idx_grp_media_group ON public.group_media(group_id);
CREATE INDEX IF NOT EXISTS idx_grp_files_group ON public.group_files(group_id);

-- ================================================================
-- ENABLE REALTIME
-- ================================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_posts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_posts;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_post_comments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_post_comments;
  END IF;
END $$;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'group_notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.group_notifications;
  END IF;
END $$;