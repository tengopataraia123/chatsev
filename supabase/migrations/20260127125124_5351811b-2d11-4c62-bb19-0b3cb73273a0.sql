-- Create triggers for automatic point awarding

-- 1. Trigger function for posts (10 points)
CREATE OR REPLACE FUNCTION public.trigger_award_post_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_points(
    NEW.user_id, 
    10, 
    'post_created', 
    'პოსტის გამოქვეყნება',
    NEW.id::TEXT
  );
  
  -- Update posts_count in gamification
  UPDATE public.user_gamification 
  SET posts_count = posts_count + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- 2. Trigger function for comments (5 points)
CREATE OR REPLACE FUNCTION public.trigger_award_comment_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_points(
    NEW.user_id, 
    5, 
    'comment_created', 
    'კომენტარის დაწერა',
    NEW.id::TEXT
  );
  
  -- Update comments_count in gamification
  UPDATE public.user_gamification 
  SET comments_count = comments_count + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- 3. Trigger function for likes given (1 point)
CREATE OR REPLACE FUNCTION public.trigger_award_like_given_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post_owner_id UUID;
BEGIN
  -- Award 1 point to the person who gave the like
  PERFORM public.award_points(
    NEW.user_id, 
    1, 
    'like_given', 
    'მოწონება',
    NEW.id::TEXT
  );
  
  -- Update likes_given in gamification
  UPDATE public.user_gamification 
  SET likes_given = likes_given + 1
  WHERE user_id = NEW.user_id;
  
  -- Get post owner and award 2 points for receiving a like
  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = NEW.post_id;
  
  IF v_post_owner_id IS NOT NULL AND v_post_owner_id != NEW.user_id THEN
    PERFORM public.award_points(
      v_post_owner_id, 
      2, 
      'like_received', 
      'მოწონება მიღებული',
      NEW.id::TEXT
    );
    
    UPDATE public.user_gamification 
    SET likes_received = likes_received + 1
    WHERE user_id = v_post_owner_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Trigger function for new friendships (5 points each)
CREATE OR REPLACE FUNCTION public.trigger_award_friendship_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted' AND (OLD IS NULL OR OLD.status != 'accepted') THEN
    -- Award points to both users
    PERFORM public.award_points(
      NEW.requester_id, 
      5, 
      'friend_added', 
      'ახალი მეგობარი',
      NEW.id::TEXT
    );
    
    PERFORM public.award_points(
      NEW.addressee_id, 
      5, 
      'friend_added', 
      'ახალი მეგობარი',
      NEW.id::TEXT
    );
    
    -- Update friends_count for both
    UPDATE public.user_gamification 
    SET friends_count = friends_count + 1
    WHERE user_id IN (NEW.requester_id, NEW.addressee_id);
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Trigger function for stories (3 points)
CREATE OR REPLACE FUNCTION public.trigger_award_story_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.award_points(
    NEW.user_id, 
    3, 
    'story_created', 
    'სთორის გამოქვეყნება',
    NEW.id::TEXT
  );
  
  UPDATE public.user_gamification 
  SET stories_count = stories_count + 1
  WHERE user_id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Create the actual triggers
DROP TRIGGER IF EXISTS trigger_post_points ON public.posts;
CREATE TRIGGER trigger_post_points
  AFTER INSERT ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_post_points();

DROP TRIGGER IF EXISTS trigger_comment_points ON public.post_comments;
CREATE TRIGGER trigger_comment_points
  AFTER INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_comment_points();

DROP TRIGGER IF EXISTS trigger_like_points ON public.post_likes;
CREATE TRIGGER trigger_like_points
  AFTER INSERT ON public.post_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_like_given_points();

DROP TRIGGER IF EXISTS trigger_friendship_points ON public.friendships;
CREATE TRIGGER trigger_friendship_points
  AFTER INSERT OR UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_friendship_points();

DROP TRIGGER IF EXISTS trigger_story_points ON public.stories;
CREATE TRIGGER trigger_story_points
  AFTER INSERT ON public.stories
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_award_story_points();