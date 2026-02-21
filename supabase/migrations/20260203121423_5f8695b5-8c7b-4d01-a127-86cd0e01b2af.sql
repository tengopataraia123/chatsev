-- Create function to update story view counts when a view is recorded
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_update_story_view_counts ON public.story_views;

-- Create trigger to update counts on insert
CREATE TRIGGER trigger_update_story_view_counts
AFTER INSERT ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.update_story_view_counts();

-- Also sync existing view counts for all stories
UPDATE public.stories s
SET 
  unique_views = (
    SELECT COUNT(DISTINCT user_id) 
    FROM public.story_views sv 
    WHERE sv.story_id = s.id
  ),
  total_views = (
    SELECT COUNT(*) 
    FROM public.story_views sv 
    WHERE sv.story_id = s.id
  );