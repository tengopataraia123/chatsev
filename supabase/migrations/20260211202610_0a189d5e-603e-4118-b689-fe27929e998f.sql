
-- Drop old video-related tables that conflict
DROP TABLE IF EXISTS public.video_views CASCADE;
DROP TABLE IF EXISTS public.video_comments CASCADE;

-- Alter videos table: add link-based columns, remove file-upload columns
ALTER TABLE public.videos 
  ADD COLUMN IF NOT EXISTS original_url text,
  ADD COLUMN IF NOT EXISTS normalized_url text,
  ADD COLUMN IF NOT EXISTS platform text DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS provider_video_id text,
  ADD COLUMN IF NOT EXISTS caption text,
  ADD COLUMN IF NOT EXISTS unique_views_count integer DEFAULT 0;

-- Make title optional (link videos may not have title)
ALTER TABLE public.videos ALTER COLUMN title DROP NOT NULL;

-- Create unique views table
CREATE TABLE IF NOT EXISTS public.video_unique_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.videos(id) ON DELETE CASCADE,
  viewer_user_id uuid NOT NULL,
  first_viewed_at timestamptz NOT NULL DEFAULT now(),
  last_viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(video_id, viewer_user_id)
);

ALTER TABLE public.video_unique_views ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_unique_views
CREATE POLICY "Anyone can read video views"
ON public.video_unique_views FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert own views"
ON public.video_unique_views FOR INSERT
WITH CHECK (auth.uid() = viewer_user_id);

CREATE POLICY "Users can update own views"
ON public.video_unique_views FOR UPDATE
USING (auth.uid() = viewer_user_id);

-- Update videos RLS - ensure public read, auth insert, owner+admin delete
DROP POLICY IF EXISTS "Anyone can view approved videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON public.videos;
DROP POLICY IF EXISTS "Users can update own videos" ON public.videos;
DROP POLICY IF EXISTS "Users can delete own videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage videos" ON public.videos;

CREATE POLICY "Anyone can view approved videos"
ON public.videos FOR SELECT USING (status = 'approved');

CREATE POLICY "Authenticated users can add videos"
ON public.videos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own videos"
ON public.videos FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Owner or admin can delete videos"
ON public.videos FOR DELETE
USING (
  auth.uid() = user_id
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Trigger: auto-increment unique_views_count on videos when new unique view inserted
CREATE OR REPLACE FUNCTION public.increment_video_unique_views()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.videos 
  SET unique_views_count = COALESCE(unique_views_count, 0) + 1
  WHERE id = NEW.video_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_video_unique_view_insert
AFTER INSERT ON public.video_unique_views
FOR EACH ROW
EXECUTE FUNCTION public.increment_video_unique_views();

-- Enable realtime for video_unique_views stats
ALTER PUBLICATION supabase_realtime ADD TABLE public.video_unique_views;
