-- Fix trigger_award_story_points to pass correct types to award_points
CREATE OR REPLACE FUNCTION public.trigger_award_story_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.award_points(
    NEW.user_id, 
    3, 
    'story_created'::text, 
    'სთორის გამოქვეყნება'::text,
    NEW.id  -- Pass as UUID directly, not as TEXT
  );
  
  UPDATE public.user_gamification 
  SET stories_count = stories_count + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the insert
  RAISE WARNING 'Failed to award points: %', SQLERRM;
  RETURN NEW;
END;
$function$;