-- Fix the trigger function to pass correct types to award_points
CREATE OR REPLACE FUNCTION public.trigger_award_friendship_points()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
    -- Award points to both users - pass proper types
    PERFORM public.award_points(
      NEW.requester_id, 
      5, 
      'friend_added'::TEXT, 
      'ახალი მეგობარი'::TEXT,
      NEW.id  -- This is already UUID, don't cast to TEXT
    );
    
    PERFORM public.award_points(
      NEW.addressee_id, 
      5, 
      'friend_added'::TEXT, 
      'ახალი მეგობარი'::TEXT,
      NEW.id  -- This is already UUID, don't cast to TEXT
    );
    
    -- Update friends_count for both
    UPDATE public.user_gamification 
    SET friends_count = friends_count + 1
    WHERE user_id IN (NEW.requester_id, NEW.addressee_id);
  END IF;
  
  RETURN NEW;
END;
$function$;