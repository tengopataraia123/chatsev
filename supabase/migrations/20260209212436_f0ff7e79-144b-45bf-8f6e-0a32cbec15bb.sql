
-- Step 1: Drop old conflicting functions
DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_group_member_role(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_group_admin_or_owner(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_group_privacy(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.auto_create_group_settings() CASCADE;
DROP FUNCTION IF EXISTS public.update_group_member_count() CASCADE;

-- Step 2: Create tables
CREATE TABLE public.group_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.group_categories(id) ON DELETE SET NULL,
  name_ka text NOT NULL,
  name_en text,
  name_ru text,
  icon text,
  color text,
  sort_order int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL,
  category_id uuid REFERENCES public.group_categories(id) ON DELETE SET NULL,
  subcategory_id uuid REFERENCES public.group_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  privacy_type text NOT NULL DEFAULT 'public',
  group_slug text UNIQUE NOT NULL,
  group_avatar_url text,
  group_cover_url text,
  is_featured boolean DEFAULT false,
  is_sponsored boolean DEFAULT false,
  member_count int DEFAULT 1,
  post_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_groups_slug ON public.groups(group_slug);
CREATE INDEX idx_groups_owner ON public.groups(owner_user_id);
CREATE INDEX idx_groups_category ON public.groups(category_id);
CREATE INDEX idx_groups_privacy ON public.groups(privacy_type);

CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  status text NOT NULL DEFAULT 'active',
  joined_at timestamptz DEFAULT now(),
  invited_by_user_id uuid,
  request_note text,
  approved_by_user_id uuid,
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

CREATE INDEX idx_group_members_group ON public.group_members(group_id);
CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_status ON public.group_members(status);

CREATE TABLE public.group_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL UNIQUE REFERENCES public.groups(id) ON DELETE CASCADE,
  who_can_view_posts text DEFAULT 'members_only',
  who_can_join text DEFAULT 'anyone',
  who_can_post text DEFAULT 'members',
  who_can_view_members text DEFAULT 'public',
  post_approval_required boolean DEFAULT false,
  enable_tabs jsonb DEFAULT '{"feed":true,"discussions":false,"members":true,"photos":true,"videos":true,"events":false,"blogs":false,"music":false,"forums":false}'::jsonb,
  default_tab text DEFAULT 'feed',
  invite_expiration_days int DEFAULT 7,
  membership_questions jsonb,
  group_rules text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.group_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text,
  image_url text,
  video_url text,
  is_approved boolean DEFAULT true,
  is_pinned boolean DEFAULT false,
  scheduled_at timestamptz,
  status text DEFAULT 'published',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_posts_group ON public.group_posts(group_id);
CREATE INDEX idx_group_posts_user ON public.group_posts(user_id);

CREATE TABLE public.group_post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.group_post_comments(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.group_post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.group_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reaction_type text DEFAULT 'like',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE public.group_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  invited_user_id uuid NOT NULL,
  invited_by_user_id uuid NOT NULL,
  status text DEFAULT 'pending',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_invites_user ON public.group_invites(invited_user_id);

CREATE TABLE public.group_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  actor_user_id uuid NOT NULL,
  action_type text NOT NULL,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Step 3: Security definer functions (AFTER tables exist)
CREATE FUNCTION public.is_group_member(p_user_id uuid, p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.group_members WHERE user_id = p_user_id AND group_id = p_group_id AND status = 'active'); $$;

CREATE FUNCTION public.get_group_member_role(p_user_id uuid, p_group_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.group_members WHERE user_id = p_user_id AND group_id = p_group_id AND status = 'active' LIMIT 1; $$;

CREATE FUNCTION public.is_group_admin_or_owner(p_user_id uuid, p_group_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.group_members WHERE user_id = p_user_id AND group_id = p_group_id AND status = 'active' AND role IN ('owner', 'admin')); $$;

CREATE FUNCTION public.get_group_privacy(p_group_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT privacy_type FROM public.groups WHERE id = p_group_id LIMIT 1; $$;

-- Step 4: RLS
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_post_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "groups_select" ON public.groups FOR SELECT USING (privacy_type IN ('public', 'closed') OR public.is_group_member(auth.uid(), id));
CREATE POLICY "groups_insert" ON public.groups FOR INSERT WITH CHECK (auth.uid() = owner_user_id);
CREATE POLICY "groups_update" ON public.groups FOR UPDATE USING (public.is_group_admin_or_owner(auth.uid(), id));
CREATE POLICY "groups_delete" ON public.groups FOR DELETE USING (owner_user_id = auth.uid());

CREATE POLICY "categories_select" ON public.group_categories FOR SELECT USING (true);

CREATE POLICY "gm_select" ON public.group_members FOR SELECT USING (public.get_group_privacy(group_id) IN ('public', 'closed') OR public.is_group_member(auth.uid(), group_id) OR user_id = auth.uid());
CREATE POLICY "gm_insert" ON public.group_members FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));
CREATE POLICY "gm_update" ON public.group_members FOR UPDATE USING (user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));
CREATE POLICY "gm_delete" ON public.group_members FOR DELETE USING (user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));

CREATE POLICY "gs_select" ON public.group_settings FOR SELECT USING (public.is_group_member(auth.uid(), group_id));
CREATE POLICY "gs_update" ON public.group_settings FOR UPDATE USING (public.is_group_admin_or_owner(auth.uid(), group_id));
CREATE POLICY "gs_insert" ON public.group_settings FOR INSERT WITH CHECK (public.is_group_admin_or_owner(auth.uid(), group_id));

CREATE POLICY "gp_select" ON public.group_posts FOR SELECT USING ((public.get_group_privacy(group_id) = 'public') OR public.is_group_member(auth.uid(), group_id));
CREATE POLICY "gp_insert" ON public.group_posts FOR INSERT WITH CHECK (auth.uid() = user_id AND public.is_group_member(auth.uid(), group_id));
CREATE POLICY "gp_update" ON public.group_posts FOR UPDATE USING (user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));
CREATE POLICY "gp_delete" ON public.group_posts FOR DELETE USING (user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));

CREATE POLICY "gpc_select" ON public.group_post_comments FOR SELECT USING (true);
CREATE POLICY "gpc_insert" ON public.group_post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gpc_update" ON public.group_post_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "gpc_delete" ON public.group_post_comments FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "gpr_select" ON public.group_post_reactions FOR SELECT USING (true);
CREATE POLICY "gpr_insert" ON public.group_post_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "gpr_delete" ON public.group_post_reactions FOR DELETE USING (user_id = auth.uid());

CREATE POLICY "gi_select" ON public.group_invites FOR SELECT USING (invited_user_id = auth.uid() OR invited_by_user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));
CREATE POLICY "gi_insert" ON public.group_invites FOR INSERT WITH CHECK (auth.uid() = invited_by_user_id AND public.is_group_member(auth.uid(), group_id));
CREATE POLICY "gi_update" ON public.group_invites FOR UPDATE USING (invited_user_id = auth.uid() OR public.is_group_admin_or_owner(auth.uid(), group_id));

CREATE POLICY "gal_select" ON public.group_audit_logs FOR SELECT USING (public.is_group_admin_or_owner(auth.uid(), group_id));
CREATE POLICY "gal_insert" ON public.group_audit_logs FOR INSERT WITH CHECK (auth.uid() = actor_user_id);

-- Step 5: Triggers
CREATE OR REPLACE FUNCTION public.auto_create_group_settings()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.group_settings (group_id, who_can_join, who_can_view_posts)
  VALUES (NEW.id,
    CASE NEW.privacy_type WHEN 'public' THEN 'anyone' WHEN 'closed' THEN 'request' WHEN 'secret' THEN 'invite_only' END,
    CASE NEW.privacy_type WHEN 'public' THEN 'public' ELSE 'members_only' END
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER trg_auto_create_group_settings AFTER INSERT ON public.groups FOR EACH ROW EXECUTE FUNCTION public.auto_create_group_settings();

CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE target_group_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN target_group_id := OLD.group_id; ELSE target_group_id := NEW.group_id; END IF;
  UPDATE public.groups SET member_count = (SELECT count(*) FROM public.group_members WHERE group_id = target_group_id AND status = 'active') WHERE id = target_group_id;
  RETURN COALESCE(NEW, OLD);
END; $$;

CREATE TRIGGER trg_update_group_member_count AFTER INSERT OR UPDATE OR DELETE ON public.group_members FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_group_settings_updated_at BEFORE UPDATE ON public.group_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_group_posts_updated_at BEFORE UPDATE ON public.group_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Step 6: Seed categories
INSERT INTO public.group_categories (name_ka, name_en, icon, sort_order) VALUES
  ('ტექნოლოგიები', 'Technology', '💻', 1),
  ('სპორტი', 'Sports', '⚽', 2),
  ('მუსიკა', 'Music', '🎵', 3),
  ('განათლება', 'Education', '📚', 4),
  ('ხელოვნება', 'Art', '🎨', 5),
  ('გეიმინგი', 'Gaming', '🎮', 6),
  ('ბიზნესი', 'Business', '💼', 7),
  ('მოგზაურობა', 'Travel', '✈️', 8),
  ('კულინარია', 'Cooking', '🍳', 9),
  ('სხვა', 'Other', '📌', 10);
