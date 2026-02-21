-- Create function to safely increment video views count
CREATE OR REPLACE FUNCTION public.increment_video_views(vid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE videos 
  SET views_count = COALESCE(views_count, 0) + 1 
  WHERE id = vid;
END;
$$;