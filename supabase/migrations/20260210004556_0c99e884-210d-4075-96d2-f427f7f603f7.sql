
-- Drop and recreate helper functions with correct param names
DROP FUNCTION IF EXISTS public.get_group_member_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_group_id_from_post(uuid) CASCADE;

-- Recreate helpers
CREATE OR REPLACE FUNCTION public.get_group_member_role(_user_id uuid, _group_id uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.group_members
  WHERE user_id = _user_id AND group_id = _group_id AND status = 'active'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_group_id_from_post(_post_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT group_id FROM public.group_posts WHERE id = _post_id LIMIT 1;
$$;

-- Add columns to group_posts
ALTER TABLE public.group_posts ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'normal';
ALTER TABLE public.group_posts ADD COLUMN IF NOT EXISTS link_preview_json jsonb DEFAULT NULL;
ALTER TABLE public.group_posts ADD COLUMN IF NOT EXISTS location_name text DEFAULT NULL;
ALTER TABLE public.group_posts ADD COLUMN IF NOT EXISTS edited_at timestamptz DEFAULT NULL;

-- Tables (IF NOT EXISTS for safety)
CREATE TABLE IF NOT EXISTS public.group_post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  media_type text NOT NULL DEFAULT 'image',
  url text NOT NULL,
  thumbnail_url text DEFAULT NULL,
  file_name text DEFAULT NULL,
  file_size bigint DEFAULT NULL,
  mime_type text DEFAULT NULL,
  sort_order int NOT NULL DEFAULT 0,
  meta_json jsonb DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_post_media ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_post_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  mentioned_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, mentioned_user_id)
);
ALTER TABLE public.group_post_mentions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_post_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE UNIQUE,
  question text NOT NULL,
  is_multiple_choice boolean NOT NULL DEFAULT false,
  ends_at timestamptz DEFAULT NULL,
  total_votes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_post_polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_post_poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.group_post_polls(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  votes_count int NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.group_post_poll_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_post_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.group_post_polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.group_post_poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, option_id, user_id)
);
ALTER TABLE public.group_post_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_post_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL,
  reason text NOT NULL,
  description text DEFAULT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid DEFAULT NULL,
  reviewed_at timestamptz DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, reporter_id)
);
ALTER TABLE public.group_post_reports ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.group_post_bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE public.group_post_bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES for new tables
CREATE POLICY "Members can view group post media" ON public.group_post_media
  FOR SELECT USING (public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));
CREATE POLICY "Members can insert group post media" ON public.group_post_media
  FOR INSERT WITH CHECK (public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));
CREATE POLICY "Authors can delete own group post media" ON public.group_post_media
  FOR DELETE USING (EXISTS (SELECT 1 FROM public.group_posts gp WHERE gp.id = post_id AND gp.user_id = auth.uid()));

CREATE POLICY "Members can view group post mentions" ON public.group_post_mentions
  FOR SELECT USING (public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));
CREATE POLICY "Members can insert group post mentions" ON public.group_post_mentions
  FOR INSERT WITH CHECK (public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));

CREATE POLICY "Members can view group post polls" ON public.group_post_polls
  FOR SELECT USING (public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));
CREATE POLICY "Members can insert group post polls" ON public.group_post_polls
  FOR INSERT WITH CHECK (public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));

CREATE POLICY "Members can view poll options" ON public.group_post_poll_options
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.group_post_polls p WHERE p.id = poll_id AND public.is_group_member(auth.uid(), public.get_group_id_from_post(p.post_id))));
CREATE POLICY "Members can insert poll options" ON public.group_post_poll_options
  FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.group_post_polls p WHERE p.id = poll_id AND public.is_group_member(auth.uid(), public.get_group_id_from_post(p.post_id))));

CREATE POLICY "Members can view poll votes" ON public.group_post_poll_votes
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.group_post_polls p WHERE p.id = poll_id AND public.is_group_member(auth.uid(), public.get_group_id_from_post(p.post_id))));
CREATE POLICY "Members can vote on polls" ON public.group_post_poll_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM public.group_post_polls p WHERE p.id = poll_id AND public.is_group_member(auth.uid(), public.get_group_id_from_post(p.post_id))));
CREATE POLICY "Users can remove own votes" ON public.group_post_poll_votes
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can report group posts" ON public.group_post_reports
  FOR INSERT WITH CHECK (auth.uid() = reporter_id AND public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));
CREATE POLICY "Admins can view reports" ON public.group_post_reports
  FOR SELECT USING (public.get_group_member_role(auth.uid(), public.get_group_id_from_post(post_id)) IN ('owner', 'admin', 'moderator'));

CREATE POLICY "Users can view own bookmarks" ON public.group_post_bookmarks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark posts" ON public.group_post_bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_group_member(auth.uid(), public.get_group_id_from_post(post_id)));
CREATE POLICY "Users can remove own bookmarks" ON public.group_post_bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_post_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_post_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_post_poll_votes;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_group_post_media_post_id ON public.group_post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_mentions_post_id ON public.group_post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_polls_post_id ON public.group_post_polls(post_id);
CREATE INDEX IF NOT EXISTS idx_group_post_poll_votes_poll_id ON public.group_post_poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_group_post_bookmarks_user_id ON public.group_post_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_group_posts_status ON public.group_posts(group_id, status, is_approved);
CREATE INDEX IF NOT EXISTS idx_group_posts_scheduled ON public.group_posts(scheduled_at) WHERE status = 'scheduled';
