-- Create function to check and award badges automatically
CREATE OR REPLACE FUNCTION public.check_and_award_badges()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  badge_record RECORD;
BEGIN
  -- Check first_post
  IF NEW.posts_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'first_post'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check ten_posts
  IF NEW.posts_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'ten_posts'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check first_friend
  IF NEW.friends_count >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'first_friend'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check ten_friends
  IF NEW.friends_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'ten_friends'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check fifty_friends
  IF NEW.friends_count >= 50 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'fifty_friends'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check first_like
  IF NEW.likes_received >= 1 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'first_like'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check hundred_likes
  IF NEW.likes_received >= 100 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'hundred_likes'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check commenter
  IF NEW.comments_count >= 10 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'commenter'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Check storyteller
  IF NEW.stories_count >= 5 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'storyteller'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  -- Level badges
  IF NEW.total_points >= 500 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'bronze_level'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  IF NEW.total_points >= 2000 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'silver_level'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  IF NEW.total_points >= 5000 THEN
    INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
    SELECT NEW.user_id, id, true FROM public.badges WHERE name = 'gold_level'
    ON CONFLICT (user_id, badge_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on user_gamification updates
DROP TRIGGER IF EXISTS trigger_check_badges ON public.user_gamification;
CREATE TRIGGER trigger_check_badges
  AFTER INSERT OR UPDATE ON public.user_gamification
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_award_badges();

-- Award newcomer badge to all existing users
INSERT INTO public.user_badges (user_id, badge_id, is_displayed)
SELECT p.user_id, b.id, true
FROM public.profiles p
CROSS JOIN public.badges b
WHERE b.name = 'newcomer'
ON CONFLICT (user_id, badge_id) DO NOTHING;