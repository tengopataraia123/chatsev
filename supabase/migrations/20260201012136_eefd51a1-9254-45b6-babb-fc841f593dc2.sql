
-- Create storage buckets for stories
INSERT INTO storage.buckets (id, name, public) 
VALUES ('story-images', 'story-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('story-videos', 'story-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for story-images
CREATE POLICY "Anyone can view story images" ON storage.objects
  FOR SELECT USING (bucket_id = 'story-images');

CREATE POLICY "Authenticated users can upload story images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own story images" ON storage.objects
  FOR DELETE USING (bucket_id = 'story-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage policies for story-videos  
CREATE POLICY "Anyone can view story videos" ON storage.objects
  FOR SELECT USING (bucket_id = 'story-videos');

CREATE POLICY "Authenticated users can upload story videos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'story-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own story videos" ON storage.objects
  FOR DELETE USING (bucket_id = 'story-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Admin highlight function
CREATE OR REPLACE FUNCTION public.admin_highlight_story(p_story_id UUID, p_highlight BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check admin permission
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied - Admin only';
  END IF;
  
  UPDATE public.stories
  SET 
    is_highlighted = p_highlight,
    highlighted_by = CASE WHEN p_highlight THEN auth.uid() ELSE NULL END,
    highlighted_at = CASE WHEN p_highlight THEN now() ELSE NULL END,
    -- If highlighting, extend expiration indefinitely (100 years)
    expires_at = CASE 
      WHEN p_highlight THEN now() + INTERVAL '100 years'
      ELSE created_at + INTERVAL '24 hours'
    END
  WHERE id = p_story_id;
  
  RETURN TRUE;
END;
$$;

-- Cleanup function for expired stories
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count INTEGER := 0;
  story_record RECORD;
BEGIN
  -- Archive analytics before deletion
  FOR story_record IN 
    SELECT id, user_id, total_views, unique_views, total_reactions, total_replies, avg_watch_time, completion_rate
    FROM public.stories
    WHERE expires_at < now() AND is_highlighted = false
  LOOP
    -- Could insert into archive table here if needed
    deleted_count := deleted_count + 1;
  END LOOP;

  -- Delete expired non-highlighted stories
  DELETE FROM public.stories
  WHERE expires_at < now() AND is_highlighted = false;
  
  RETURN deleted_count;
END;
$$;
