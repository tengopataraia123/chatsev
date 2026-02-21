
-- Fix notifications INSERT policy  
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
CREATE POLICY "Authenticated users can create notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (auth.uid() = from_user_id OR auth.uid() = user_id);

-- Rate limiting function and triggers
CREATE OR REPLACE FUNCTION public.check_rate_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  recent_count INTEGER;
  max_per_5min INTEGER;
BEGIN
  CASE TG_TABLE_NAME
    WHEN 'posts' THEN max_per_5min := 10;
    WHEN 'post_comments' THEN max_per_5min := 30;
    WHEN 'comment_replies' THEN max_per_5min := 30;
    WHEN 'stories' THEN max_per_5min := 5;
    WHEN 'confessions' THEN max_per_5min := 5;
    WHEN 'blog_posts' THEN max_per_5min := 3;
    ELSE max_per_5min := 20;
  END CASE;

  EXECUTE format(
    'SELECT COUNT(*) FROM %I WHERE user_id = $1 AND created_at > now() - interval ''5 minutes''',
    TG_TABLE_NAME
  ) INTO recent_count USING NEW.user_id;

  IF recent_count >= max_per_5min THEN
    RAISE EXCEPTION 'ლიმიტი გადაჭარბებულია. სცადეთ მოგვიანებით.';
  END IF;

  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rate_limit_posts') THEN
    CREATE TRIGGER rate_limit_posts BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.check_rate_limit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rate_limit_post_comments') THEN
    CREATE TRIGGER rate_limit_post_comments BEFORE INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.check_rate_limit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rate_limit_comment_replies') THEN
    CREATE TRIGGER rate_limit_comment_replies BEFORE INSERT ON public.comment_replies FOR EACH ROW EXECUTE FUNCTION public.check_rate_limit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rate_limit_stories') THEN
    CREATE TRIGGER rate_limit_stories BEFORE INSERT ON public.stories FOR EACH ROW EXECUTE FUNCTION public.check_rate_limit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rate_limit_confessions') THEN
    CREATE TRIGGER rate_limit_confessions BEFORE INSERT ON public.confessions FOR EACH ROW EXECUTE FUNCTION public.check_rate_limit();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'rate_limit_blog_posts') THEN
    CREATE TRIGGER rate_limit_blog_posts BEFORE INSERT ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.check_rate_limit();
  END IF;
END $$;
