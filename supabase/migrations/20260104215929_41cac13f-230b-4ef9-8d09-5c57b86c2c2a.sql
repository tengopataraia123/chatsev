-- Create GIF categories table
CREATE TABLE public.gif_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create GIFs table
CREATE TABLE public.gifs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  category_id UUID REFERENCES public.gif_categories(id) ON DELETE SET NULL,
  file_original TEXT NOT NULL,
  file_preview TEXT,
  size INTEGER,
  width INTEGER,
  height INTEGER,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'hidden')),
  usage_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user GIF favorites table
CREATE TABLE public.gif_favorites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gif_id UUID NOT NULL REFERENCES public.gifs(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, gif_id)
);

-- Create user recent GIFs table
CREATE TABLE public.gif_recent (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  gif_id UUID NOT NULL REFERENCES public.gifs(id) ON DELETE CASCADE,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create comment replies table for nested comments
CREATE TABLE public.comment_replies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.gif_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gif_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gif_recent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_replies ENABLE ROW LEVEL SECURITY;

-- GIF Categories policies
CREATE POLICY "Anyone can view active categories" ON public.gif_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage categories" ON public.gif_categories
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- GIFs policies
CREATE POLICY "Anyone can view active gifs" ON public.gifs
  FOR SELECT USING (status = 'active');

CREATE POLICY "Admins can manage gifs" ON public.gifs
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- GIF Favorites policies
CREATE POLICY "Users can view their favorites" ON public.gif_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add favorites" ON public.gif_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove favorites" ON public.gif_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- GIF Recent policies
CREATE POLICY "Users can view their recent" ON public.gif_recent
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can add recent" ON public.gif_recent
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their recent" ON public.gif_recent
  FOR DELETE USING (auth.uid() = user_id);

-- Comment replies policies
CREATE POLICY "Anyone can view replies" ON public.comment_replies
  FOR SELECT USING (true);

CREATE POLICY "Users can create replies" ON public.comment_replies
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their replies" ON public.comment_replies
  FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for GIFs
INSERT INTO storage.buckets (id, name, public) VALUES ('gifs', 'gifs', true);

-- GIF storage policies
CREATE POLICY "Anyone can view gifs" ON storage.objects
  FOR SELECT USING (bucket_id = 'gifs');

CREATE POLICY "Admins can upload gifs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'gifs' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete gifs" ON storage.objects
  FOR DELETE USING (bucket_id = 'gifs' AND has_role(auth.uid(), 'admin'));

-- Add gif_id column to messages for GIF support
ALTER TABLE public.private_messages ADD COLUMN IF NOT EXISTS gif_id UUID REFERENCES public.gifs(id);
ALTER TABLE public.group_chat_messages ADD COLUMN IF NOT EXISTS gif_id UUID REFERENCES public.gifs(id);
ALTER TABLE public.post_comments ADD COLUMN IF NOT EXISTS gif_id UUID REFERENCES public.gifs(id);
ALTER TABLE public.comment_replies ADD COLUMN IF NOT EXISTS gif_id UUID REFERENCES public.gifs(id);

-- Create indexes for better performance
CREATE INDEX idx_gifs_category ON public.gifs(category_id);
CREATE INDEX idx_gifs_status ON public.gifs(status);
CREATE INDEX idx_gif_favorites_user ON public.gif_favorites(user_id);
CREATE INDEX idx_gif_recent_user ON public.gif_recent(user_id);
CREATE INDEX idx_comment_replies_comment ON public.comment_replies(comment_id);