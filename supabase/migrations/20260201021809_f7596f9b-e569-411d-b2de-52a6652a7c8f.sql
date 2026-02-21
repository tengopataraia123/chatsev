-- Drop existing function first to change return type
DROP FUNCTION IF EXISTS public.cleanup_expired_stories();

-- Create function to cleanup expired stories and notify owners
CREATE OR REPLACE FUNCTION public.cleanup_expired_stories()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_story RECORD;
  v_deleted_count integer := 0;
  v_notified_count integer := 0;
BEGIN
  -- Find and process expired stories
  FOR v_story IN 
    SELECT id, user_id, unique_views, total_reactions, total_replies
    FROM public.stories
    WHERE expires_at <= now()
  LOOP
    -- Send notification to owner with stats
    INSERT INTO public.notifications (
      user_id,
      type,
      message,
      from_user_id,
      related_type,
      is_read
    ) VALUES (
      v_story.user_id,
      'story_expired',
      format('შენი სთორის ვადა ამოიწურა 🕐 | 👁️ %s ნახვა | ❤️ %s რეაქცია | 💬 %s პასუხი | ატვირთე ახალი სთორი ✨', 
        COALESCE(v_story.unique_views, 0), 
        COALESCE(v_story.total_reactions, 0), 
        COALESCE(v_story.total_replies, 0)
      ),
      v_story.user_id,
      'story',
      false
    );
    v_notified_count := v_notified_count + 1;
    
    -- Delete the story
    DELETE FROM public.stories WHERE id = v_story.id;
    v_deleted_count := v_deleted_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'deleted_stories', v_deleted_count,
    'notifications_sent', v_notified_count,
    'cleanup_time', now()
  );
END;
$$;