-- Make video_url nullable for Mux uploads (URL comes after processing)
ALTER TABLE public.videos ALTER COLUMN video_url DROP NOT NULL;

-- Add index for better feed performance
CREATE INDEX IF NOT EXISTS idx_videos_status_created ON public.videos(status, created_at DESC);

-- Create video_likes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.video_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(video_id, user_id)
);

-- Create video_comments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.video_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_shares table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.video_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  share_type TEXT DEFAULT 'copy',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.video_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_shares ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_likes
CREATE POLICY "Anyone can view video likes" ON public.video_likes FOR SELECT USING (true);
CREATE POLICY "Users can like videos" ON public.video_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike their own likes" ON public.video_likes FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for video_comments
CREATE POLICY "Anyone can view video comments" ON public.video_comments FOR SELECT USING (true);
CREATE POLICY "Users can comment on videos" ON public.video_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.video_comments FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for video_shares
CREATE POLICY "Anyone can view video shares" ON public.video_shares FOR SELECT USING (true);
CREATE POLICY "Users can share videos" ON public.video_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Enable realtime for video interactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_comments;