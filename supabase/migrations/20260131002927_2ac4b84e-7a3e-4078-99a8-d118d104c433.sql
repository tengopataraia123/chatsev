-- Fix the delete_expired_stories function to not use metadata column
CREATE OR REPLACE FUNCTION public.delete_expired_stories_with_notification()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  expired_story RECORD;
  deleted_count integer := 0;
  view_count integer;
  reaction_count integer;
BEGIN
  -- Loop through all expired stories
  FOR expired_story IN 
    SELECT s.id, s.user_id, s.created_at
    FROM public.stories s
    WHERE s.expires_at < now()
  LOOP
    -- Get view count
    SELECT COUNT(*) INTO view_count
    FROM public.story_views
    WHERE story_id = expired_story.id;
    
    -- Get reaction count
    SELECT COUNT(*) INTO reaction_count
    FROM public.story_reactions
    WHERE story_id = expired_story.id;
    
    -- Send notification to story owner (only if there were views or reactions)
    IF view_count > 0 OR reaction_count > 0 THEN
      INSERT INTO public.notifications (user_id, type, message)
      VALUES (
        expired_story.user_id,
        'story_expired',
        format('შენს სთორის ვადა გავიდა - %s ნახვა, %s რეაქცია', view_count, reaction_count)
      );
    END IF;
    
    -- Delete related data first
    DELETE FROM public.story_views WHERE story_id = expired_story.id;
    DELETE FROM public.story_reactions WHERE story_id = expired_story.id;
    
    -- Delete the story
    DELETE FROM public.stories WHERE id = expired_story.id;
    deleted_count := deleted_count + 1;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;