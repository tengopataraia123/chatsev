-- Fix the trigger function to use correct column name (user_id instead of viewer_id)
CREATE OR REPLACE FUNCTION public.update_story_view_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the unique_views and total_views on the stories table
  UPDATE public.stories
  SET 
    unique_views = (
      SELECT COUNT(DISTINCT user_id) 
      FROM public.story_views 
      WHERE story_id = NEW.story_id
    ),
    total_views = (
      SELECT COUNT(*) 
      FROM public.story_views 
      WHERE story_id = NEW.story_id
    )
  WHERE id = NEW.story_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Re-sync all existing view counts
UPDATE public.stories s
SET 
  unique_views = COALESCE((
    SELECT COUNT(DISTINCT sv.user_id) 
    FROM public.story_views sv 
    WHERE sv.story_id = s.id
  ), 0),
  total_views = COALESCE((
    SELECT COUNT(*) 
    FROM public.story_views sv 
    WHERE sv.story_id = s.id
  ), 0);