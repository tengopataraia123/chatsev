-- Create reels table for short videos
CREATE TABLE public.reels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  description TEXT,
  music_title TEXT,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view reels" ON public.reels FOR SELECT USING (true);
CREATE POLICY "Users can create their own reels" ON public.reels FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reels" ON public.reels FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reels" ON public.reels FOR DELETE USING (auth.uid() = user_id);

-- Create reels likes table
CREATE TABLE public.reel_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reel_id, user_id)
);

ALTER TABLE public.reel_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reel likes" ON public.reel_likes FOR SELECT USING (true);
CREATE POLICY "Users can like reels" ON public.reel_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike reels" ON public.reel_likes FOR DELETE USING (auth.uid() = user_id);

-- Create reels comments table
CREATE TABLE public.reel_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reel_id UUID NOT NULL REFERENCES public.reels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.reel_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reel comments" ON public.reel_comments FOR SELECT USING (true);
CREATE POLICY "Users can create comments" ON public.reel_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.reel_comments FOR DELETE USING (auth.uid() = user_id);

-- Create storage bucket for reels videos
INSERT INTO storage.buckets (id, name, public) VALUES ('reels', 'reels', true);

-- Storage policies
CREATE POLICY "Anyone can view reels videos" ON storage.objects FOR SELECT USING (bucket_id = 'reels');
CREATE POLICY "Authenticated users can upload reels" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'reels' AND auth.role() = 'authenticated');
CREATE POLICY "Users can delete their own reels" ON storage.objects FOR DELETE USING (bucket_id = 'reels' AND auth.uid()::text = (storage.foldername(name))[1]);