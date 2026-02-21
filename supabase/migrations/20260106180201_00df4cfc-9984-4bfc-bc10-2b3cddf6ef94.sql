
-- Create videos table
CREATE TABLE public.videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- in seconds
  file_size BIGINT, -- in bytes
  views_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create video_views table for tracking unique views with 3+ second watch time
CREATE TABLE public.video_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id UUID NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  user_id UUID,
  session_id TEXT,
  ip_address TEXT,
  watched_seconds INTEGER NOT NULL DEFAULT 0,
  counted_as_view BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create unique index to prevent duplicate views per user/session
CREATE UNIQUE INDEX idx_video_views_unique_user ON public.video_views(video_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_video_views_unique_session ON public.video_views(video_id, session_id) WHERE user_id IS NULL AND session_id IS NOT NULL;

-- Create index for faster queries
CREATE INDEX idx_videos_user_id ON public.videos(user_id);
CREATE INDEX idx_videos_status ON public.videos(status);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);
CREATE INDEX idx_videos_views_count ON public.videos(views_count DESC);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_views ENABLE ROW LEVEL SECURITY;

-- Videos policies
CREATE POLICY "Anyone can view approved videos" 
ON public.videos FOR SELECT 
USING (status = 'approved');

CREATE POLICY "Users can view their own videos" 
ON public.videos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all videos" 
ON public.videos FOR SELECT 
USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users can insert their own videos" 
ON public.videos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own videos" 
ON public.videos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can update any video" 
ON public.videos FOR UPDATE 
USING (public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users can delete their own videos" 
ON public.videos FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any video" 
ON public.videos FOR DELETE 
USING (public.has_role(auth.uid(), 'moderator'));

-- Video views policies
CREATE POLICY "Anyone can insert video views" 
ON public.video_views FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can view video views" 
ON public.video_views FOR SELECT 
USING (true);

CREATE POLICY "Anyone can update video views" 
ON public.video_views FOR UPDATE 
USING (true);

-- Create trigger to update updated_at
CREATE TRIGGER update_videos_updated_at
BEFORE UPDATE ON public.videos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for videos
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('videos', 'videos', true, 524288000)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 524288000;

-- Storage policies for videos bucket
CREATE POLICY "Anyone can view videos" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can upload videos" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'videos' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own videos" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own videos" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete any video" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'videos' AND public.has_role(auth.uid(), 'moderator'));

-- Enable realtime for videos
ALTER PUBLICATION supabase_realtime ADD TABLE public.videos;
