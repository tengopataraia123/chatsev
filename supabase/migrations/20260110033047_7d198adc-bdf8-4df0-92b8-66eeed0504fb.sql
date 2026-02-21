-- Blog Categories
CREATE TABLE IF NOT EXISTS public.blog_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  color TEXT DEFAULT '#8B5CF6',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog Posts (enhanced)
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_url TEXT,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  tags TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  is_featured BOOLEAN DEFAULT false,
  is_pinned BOOLEAN DEFAULT false,
  views_count INTEGER DEFAULT 0,
  reading_time_minutes INTEGER DEFAULT 1,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog Reactions
CREATE TABLE IF NOT EXISTS public.blog_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'care', 'haha', 'wow', 'sad', 'angry')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, user_id)
);

-- Blog Comments
CREATE TABLE IF NOT EXISTS public.blog_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  parent_id UUID REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  gif_id UUID REFERENCES public.gifs(id),
  is_edited BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog Comment Reactions
CREATE TABLE IF NOT EXISTS public.blog_comment_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.blog_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Blog Bookmarks
CREATE TABLE IF NOT EXISTS public.blog_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(blog_id, user_id)
);

-- Blog Shares
CREATE TABLE IF NOT EXISTS public.blog_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_type TEXT DEFAULT 'feed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog Views (for analytics)
CREATE TABLE IF NOT EXISTS public.blog_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  user_id UUID,
  reading_progress REAL DEFAULT 0,
  time_spent_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Blog Reports
CREATE TABLE IF NOT EXISTS public.blog_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Blog Interests (for AI recommendations)
CREATE TABLE IF NOT EXISTS public.user_blog_interests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID REFERENCES public.blog_categories(id) ON DELETE CASCADE,
  tag TEXT,
  score REAL DEFAULT 1.0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category_id, tag)
);

-- Enable RLS
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blog_interests ENABLE ROW LEVEL SECURITY;

-- Blog Categories policies
CREATE POLICY "Anyone can view active categories" ON public.blog_categories FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage categories" ON public.blog_categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
);

-- Blog Posts policies
CREATE POLICY "Anyone can view approved posts" ON public.blog_posts FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can view own posts" ON public.blog_posts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create posts" ON public.blog_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own posts" ON public.blog_posts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own posts" ON public.blog_posts FOR DELETE USING (user_id = auth.uid());
CREATE POLICY "Admins can manage all posts" ON public.blog_posts FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
);

-- Blog Reactions policies
CREATE POLICY "Anyone can view reactions" ON public.blog_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own reactions" ON public.blog_reactions FOR ALL USING (auth.uid() = user_id);

-- Blog Comments policies
CREATE POLICY "Anyone can view comments" ON public.blog_comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "Users can create comments" ON public.blog_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own comments" ON public.blog_comments FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own comments" ON public.blog_comments FOR DELETE USING (user_id = auth.uid());

-- Blog Comment Reactions policies
CREATE POLICY "Anyone can view comment reactions" ON public.blog_comment_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage own comment reactions" ON public.blog_comment_reactions FOR ALL USING (auth.uid() = user_id);

-- Blog Bookmarks policies
CREATE POLICY "Users can view own bookmarks" ON public.blog_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own bookmarks" ON public.blog_bookmarks FOR ALL USING (auth.uid() = user_id);

-- Blog Shares policies
CREATE POLICY "Anyone can view shares" ON public.blog_shares FOR SELECT USING (true);
CREATE POLICY "Users can create shares" ON public.blog_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Blog Views policies
CREATE POLICY "Anyone can create views" ON public.blog_views FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can view own reading history" ON public.blog_views FOR SELECT USING (user_id = auth.uid());

-- Blog Reports policies
CREATE POLICY "Users can create reports" ON public.blog_reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins can view reports" ON public.blog_reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('super_admin', 'admin', 'moderator'))
);

-- User Blog Interests policies
CREATE POLICY "Users can manage own interests" ON public.user_blog_interests FOR ALL USING (auth.uid() = user_id);

-- Create indexes
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_category ON public.blog_posts(category_id);
CREATE INDEX idx_blog_posts_user ON public.blog_posts(user_id);
CREATE INDEX idx_blog_posts_published ON public.blog_posts(published_at DESC);
CREATE INDEX idx_blog_reactions_blog ON public.blog_reactions(blog_id);
CREATE INDEX idx_blog_comments_blog ON public.blog_comments(blog_id);
CREATE INDEX idx_blog_views_blog ON public.blog_views(blog_id);

-- Insert default categories
INSERT INTO public.blog_categories (name, slug, description, icon, color, sort_order) VALUES
('ტექნოლოგია', 'technology', 'ტექნოლოგიური სიახლეები', 'Laptop', '#3B82F6', 1),
('ცხოვრება', 'lifestyle', 'ცხოვრების სტილი', 'Heart', '#EC4899', 2),
('ბიზნესი', 'business', 'ბიზნესი და ფინანსები', 'Briefcase', '#10B981', 3),
('გართობა', 'entertainment', 'გართობა და კულტურა', 'Music', '#F59E0B', 4),
('სპორტი', 'sports', 'სპორტული სიახლეები', 'Trophy', '#EF4444', 5),
('მეცნიერება', 'science', 'მეცნიერება და განათლება', 'Atom', '#8B5CF6', 6)
ON CONFLICT (slug) DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.blog_reactions;