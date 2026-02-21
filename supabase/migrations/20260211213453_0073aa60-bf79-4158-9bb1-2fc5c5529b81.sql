
-- Function to award points and update counters
CREATE OR REPLACE FUNCTION public.award_activity_points(
  p_user_id UUID,
  p_action TEXT,
  p_points INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO user_gamification (user_id, total_points, experience_points, last_activity_date)
  VALUES (p_user_id, p_points, p_points, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_gamification.total_points + p_points,
    experience_points = user_gamification.experience_points + p_points,
    last_activity_date = CURRENT_DATE,
    updated_at = now(),
    -- Update specific counters
    posts_count = CASE WHEN p_action = 'post' THEN user_gamification.posts_count + 1 ELSE user_gamification.posts_count END,
    comments_count = CASE WHEN p_action = 'comment' THEN user_gamification.comments_count + 1 ELSE user_gamification.comments_count END,
    likes_given = CASE WHEN p_action = 'like_given' THEN user_gamification.likes_given + 1 ELSE user_gamification.likes_given END,
    likes_received = CASE WHEN p_action = 'like_received' THEN user_gamification.likes_received + 1 ELSE user_gamification.likes_received END,
    friends_count = CASE WHEN p_action = 'follower' THEN user_gamification.friends_count + 1 ELSE user_gamification.friends_count END,
    stories_count = CASE WHEN p_action = 'story' THEN user_gamification.stories_count + 1 ELSE user_gamification.stories_count END,
    games_played = CASE WHEN p_action = 'game' THEN user_gamification.games_played + 1 ELSE user_gamification.games_played END,
    -- Update level based on total points
    current_level = CASE
      WHEN user_gamification.total_points + p_points >= 5000 THEN 10
      WHEN user_gamification.total_points + p_points >= 3000 THEN 9
      WHEN user_gamification.total_points + p_points >= 2000 THEN 8
      WHEN user_gamification.total_points + p_points >= 1500 THEN 7
      WHEN user_gamification.total_points + p_points >= 1000 THEN 6
      WHEN user_gamification.total_points + p_points >= 700 THEN 5
      WHEN user_gamification.total_points + p_points >= 400 THEN 4
      WHEN user_gamification.total_points + p_points >= 200 THEN 3
      WHEN user_gamification.total_points + p_points >= 50 THEN 2
      ELSE 1
    END,
    -- Update streak
    streak_days = CASE
      WHEN user_gamification.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN user_gamification.streak_days + 1
      WHEN user_gamification.last_activity_date = CURRENT_DATE THEN user_gamification.streak_days
      ELSE 1
    END;
END;
$$;

-- Trigger: Posts (+10 points)
CREATE OR REPLACE FUNCTION public.trigger_post_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_activity_points(NEW.user_id, 'post', 10);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_post_created_points ON public.posts;
CREATE TRIGGER on_post_created_points
  AFTER INSERT ON public.posts
  FOR EACH ROW EXECUTE FUNCTION trigger_post_points();

-- Trigger: Comments (+5 points)
CREATE OR REPLACE FUNCTION public.trigger_comment_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_activity_points(NEW.user_id, 'comment', 5);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_comment_created_points ON public.post_comments;
CREATE TRIGGER on_comment_created_points
  AFTER INSERT ON public.post_comments
  FOR EACH ROW EXECUTE FUNCTION trigger_comment_points();

-- Trigger: Like given (+2 points for liker)
CREATE OR REPLACE FUNCTION public.trigger_like_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_post_owner UUID;
BEGIN
  PERFORM award_activity_points(NEW.user_id, 'like_given', 2);
  -- Also give +2 to post owner
  SELECT user_id INTO v_post_owner FROM posts WHERE id = NEW.post_id;
  IF v_post_owner IS NOT NULL AND v_post_owner != NEW.user_id THEN
    PERFORM award_activity_points(v_post_owner, 'like_received', 2);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_like_created_points ON public.post_likes;
CREATE TRIGGER on_like_created_points
  AFTER INSERT ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION trigger_like_points();

-- Trigger: New follower (+3 points for followed user)
CREATE OR REPLACE FUNCTION public.trigger_follower_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_activity_points(NEW.following_id, 'follower', 3);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_follow_created_points ON public.followers;
CREATE TRIGGER on_follow_created_points
  AFTER INSERT ON public.followers
  FOR EACH ROW EXECUTE FUNCTION trigger_follower_points();

-- Trigger: Story (+5 points)
CREATE OR REPLACE FUNCTION public.trigger_story_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_activity_points(NEW.user_id, 'story', 5);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_story_created_points ON public.stories;
CREATE TRIGGER on_story_created_points
  AFTER INSERT ON public.stories
  FOR EACH ROW EXECUTE FUNCTION trigger_story_points();

-- Trigger: Video shared (+8 points)
CREATE OR REPLACE FUNCTION public.trigger_video_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_activity_points(NEW.user_id, 'video', 8);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_video_created_points ON public.videos;
CREATE TRIGGER on_video_created_points
  AFTER INSERT ON public.videos
  FOR EACH ROW EXECUTE FUNCTION trigger_video_points();

-- Trigger: Blog post (+15 points)
CREATE OR REPLACE FUNCTION public.trigger_blog_points() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM award_activity_points(NEW.user_id, 'blog', 15);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_blog_created_points ON public.blog_posts;
CREATE TRIGGER on_blog_created_points
  AFTER INSERT ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION trigger_blog_points();

-- Create activity_points_log table to track point history
CREATE TABLE IF NOT EXISTS public.activity_points_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  points INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_points_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own point history"
  ON public.activity_points_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_points_log_user_id ON public.activity_points_log(user_id, created_at DESC);

-- Updated award function to also log
CREATE OR REPLACE FUNCTION public.award_activity_points(
  p_user_id UUID,
  p_action TEXT,
  p_points INTEGER
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Log the point award
  INSERT INTO activity_points_log (user_id, action, points) 
  VALUES (p_user_id, p_action, p_points);

  INSERT INTO user_gamification (user_id, total_points, experience_points, last_activity_date)
  VALUES (p_user_id, p_points, p_points, CURRENT_DATE)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_gamification.total_points + p_points,
    experience_points = user_gamification.experience_points + p_points,
    last_activity_date = CURRENT_DATE,
    updated_at = now(),
    posts_count = CASE WHEN p_action = 'post' THEN user_gamification.posts_count + 1 ELSE user_gamification.posts_count END,
    comments_count = CASE WHEN p_action = 'comment' THEN user_gamification.comments_count + 1 ELSE user_gamification.comments_count END,
    likes_given = CASE WHEN p_action = 'like_given' THEN user_gamification.likes_given + 1 ELSE user_gamification.likes_given END,
    likes_received = CASE WHEN p_action = 'like_received' THEN user_gamification.likes_received + 1 ELSE user_gamification.likes_received END,
    friends_count = CASE WHEN p_action = 'follower' THEN user_gamification.friends_count + 1 ELSE user_gamification.friends_count END,
    stories_count = CASE WHEN p_action = 'story' THEN user_gamification.stories_count + 1 ELSE user_gamification.stories_count END,
    games_played = CASE WHEN p_action = 'game' THEN user_gamification.games_played + 1 ELSE user_gamification.games_played END,
    current_level = CASE
      WHEN user_gamification.total_points + p_points >= 5000 THEN 10
      WHEN user_gamification.total_points + p_points >= 3000 THEN 9
      WHEN user_gamification.total_points + p_points >= 2000 THEN 8
      WHEN user_gamification.total_points + p_points >= 1500 THEN 7
      WHEN user_gamification.total_points + p_points >= 1000 THEN 6
      WHEN user_gamification.total_points + p_points >= 700 THEN 5
      WHEN user_gamification.total_points + p_points >= 400 THEN 4
      WHEN user_gamification.total_points + p_points >= 200 THEN 3
      WHEN user_gamification.total_points + p_points >= 50 THEN 2
      ELSE 1
    END,
    streak_days = CASE
      WHEN user_gamification.last_activity_date = CURRENT_DATE - INTERVAL '1 day' THEN user_gamification.streak_days + 1
      WHEN user_gamification.last_activity_date = CURRENT_DATE THEN user_gamification.streak_days
      ELSE 1
    END;
END;
$$;
