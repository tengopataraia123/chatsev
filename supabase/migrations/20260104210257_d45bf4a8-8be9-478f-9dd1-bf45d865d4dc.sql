-- Add online_visible_until to profiles for tracking online status duration
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS online_visible_until TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '1 hour');

-- Create site settings table for admin configurations
CREATE TABLE IF NOT EXISTS public.site_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Only admins can manage settings" ON public.site_settings FOR ALL USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default online duration setting
INSERT INTO public.site_settings (setting_key, setting_value) VALUES ('online_duration_minutes', '60') ON CONFLICT (setting_key) DO NOTHING;

-- Create forums table
CREATE TABLE IF NOT EXISTS public.forums (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'general',
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forums ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view forums" ON public.forums FOR SELECT USING (true);
CREATE POLICY "Users can create forums" ON public.forums FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their forums" ON public.forums FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their forums" ON public.forums FOR DELETE USING (auth.uid() = user_id);

-- Create forum posts/replies table
CREATE TABLE IF NOT EXISTS public.forum_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  forum_id UUID NOT NULL REFERENCES public.forums(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view forum posts" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "Users can create forum posts" ON public.forum_posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their forum posts" ON public.forum_posts FOR DELETE USING (auth.uid() = user_id);

-- Create music table
CREATE TABLE IF NOT EXISTS public.music (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  user_id UUID NOT NULL,
  plays INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.music ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view music" ON public.music FOR SELECT USING (true);
CREATE POLICY "Users can upload music" ON public.music FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their music" ON public.music FOR DELETE USING (auth.uid() = user_id);

-- Create quizzes table
CREATE TABLE IF NOT EXISTS public.quizzes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view quizzes" ON public.quizzes FOR SELECT USING (true);
CREATE POLICY "Users can create quizzes" ON public.quizzes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their quizzes" ON public.quizzes FOR DELETE USING (auth.uid() = user_id);

-- Create quiz questions
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answer INTEGER NOT NULL DEFAULT 0,
  order_index INTEGER DEFAULT 0
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view quiz questions" ON public.quiz_questions FOR SELECT USING (true);
CREATE POLICY "Quiz owners can manage questions" ON public.quiz_questions FOR ALL USING (EXISTS(SELECT 1 FROM quizzes WHERE id = quiz_id AND user_id = auth.uid()));

-- Create quiz results
CREATE TABLE IF NOT EXISTS public.quiz_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  total_questions INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view quiz results" ON public.quiz_results FOR SELECT USING (true);
CREATE POLICY "Users can submit quiz results" ON public.quiz_results FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create polls table
CREATE TABLE IF NOT EXISTS public.polls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question TEXT NOT NULL,
  options JSONB NOT NULL DEFAULT '[]',
  user_id UUID NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view polls" ON public.polls FOR SELECT USING (true);
CREATE POLICY "Users can create polls" ON public.polls FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their polls" ON public.polls FOR DELETE USING (auth.uid() = user_id);

-- Create poll votes
CREATE TABLE IF NOT EXISTS public.poll_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view poll votes" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "Users can vote" ON public.poll_votes FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create marketplace listings
CREATE TABLE IF NOT EXISTS public.marketplace_listings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'GEL',
  category TEXT NOT NULL DEFAULT 'other',
  image_urls JSONB DEFAULT '[]',
  user_id UUID NOT NULL,
  is_sold BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.marketplace_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view listings" ON public.marketplace_listings FOR SELECT USING (true);
CREATE POLICY "Users can create listings" ON public.marketplace_listings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their listings" ON public.marketplace_listings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their listings" ON public.marketplace_listings FOR DELETE USING (auth.uid() = user_id);

-- Create groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  owner_id UUID NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view public groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Users can create groups" ON public.groups FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update groups" ON public.groups FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete groups" ON public.groups FOR DELETE USING (auth.uid() = owner_id);

-- Create group members
CREATE TABLE IF NOT EXISTS public.group_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(group_id, user_id)
);

ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view members" ON public.group_members FOR SELECT USING (true);
CREATE POLICY "Users can join groups" ON public.group_members FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can leave groups" ON public.group_members FOR DELETE USING (auth.uid() = user_id);

-- Create group posts
CREATE TABLE IF NOT EXISTS public.group_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.group_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view group posts" ON public.group_posts FOR SELECT USING (EXISTS(SELECT 1 FROM group_members WHERE group_id = group_posts.group_id AND user_id = auth.uid()) OR EXISTS(SELECT 1 FROM groups WHERE id = group_posts.group_id AND NOT is_private));
CREATE POLICY "Members can create posts" ON public.group_posts FOR INSERT WITH CHECK (EXISTS(SELECT 1 FROM group_members WHERE group_id = group_posts.group_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete their posts" ON public.group_posts FOR DELETE USING (auth.uid() = user_id);

-- Create pages table
CREATE TABLE IF NOT EXISTS public.pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other',
  cover_url TEXT,
  avatar_url TEXT,
  owner_id UUID NOT NULL,
  followers_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view pages" ON public.pages FOR SELECT USING (true);
CREATE POLICY "Users can create pages" ON public.pages FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owners can update pages" ON public.pages FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owners can delete pages" ON public.pages FOR DELETE USING (auth.uid() = owner_id);

-- Create page followers
CREATE TABLE IF NOT EXISTS public.page_followers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES public.pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  followed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_id, user_id)
);

ALTER TABLE public.page_followers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view page followers" ON public.page_followers FOR SELECT USING (true);
CREATE POLICY "Users can follow pages" ON public.page_followers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unfollow pages" ON public.page_followers FOR DELETE USING (auth.uid() = user_id);

-- Create blogs table
CREATE TABLE IF NOT EXISTS public.blogs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  cover_url TEXT,
  user_id UUID NOT NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.blogs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view blogs" ON public.blogs FOR SELECT USING (true);
CREATE POLICY "Users can create blogs" ON public.blogs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their blogs" ON public.blogs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their blogs" ON public.blogs FOR DELETE USING (auth.uid() = user_id);

-- Enable realtime for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;