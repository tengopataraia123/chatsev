
-- Create trigger function to update stories view counts on story_views changes
CREATE OR REPLACE FUNCTION public.update_story_view_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories
    SET total_views = (SELECT count(*) FROM public.story_views WHERE story_id = NEW.story_id),
        unique_views = (SELECT count(DISTINCT user_id) FROM public.story_views WHERE story_id = NEW.story_id)
    WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories
    SET total_views = (SELECT count(*) FROM public.story_views WHERE story_id = OLD.story_id),
        unique_views = (SELECT count(DISTINCT user_id) FROM public.story_views WHERE story_id = OLD.story_id)
    WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
CREATE TRIGGER on_story_view_change
AFTER INSERT OR DELETE ON public.story_views
FOR EACH ROW
EXECUTE FUNCTION public.update_story_view_counts();

-- Sync existing data
UPDATE public.stories s
SET total_views = COALESCE(sv.cnt, 0),
    unique_views = COALESCE(sv.ucnt, 0)
FROM (
  SELECT story_id, count(*) as cnt, count(DISTINCT user_id) as ucnt
  FROM public.story_views
  GROUP BY story_id
) sv
WHERE s.id = sv.story_id;
