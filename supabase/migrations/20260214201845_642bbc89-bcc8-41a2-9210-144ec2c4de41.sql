
-- Fix existing data that violates constraints
UPDATE public.comment_replies SET content = LEFT(content, 5000) WHERE length(content) > 5000;
UPDATE public.comment_replies SET content = '.' WHERE content IS NOT NULL AND length(content) = 0;

-- Now add constraints
DO $$ BEGIN
  ALTER TABLE public.post_comments ADD CONSTRAINT check_comment_content_length 
    CHECK (length(content) > 0 AND length(content) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.posts ADD CONSTRAINT check_post_content_length 
    CHECK (length(content) <= 10000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.comment_replies ADD CONSTRAINT check_reply_content_length 
    CHECK (length(content) > 0 AND length(content) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blog_comments ADD CONSTRAINT check_blog_comment_length 
    CHECK (length(content) > 0 AND length(content) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blog_posts ADD CONSTRAINT check_blog_title_length 
    CHECK (length(title) > 0 AND length(title) <= 500);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.blog_posts ADD CONSTRAINT check_blog_content_length 
    CHECK (length(content) > 0 AND length(content) <= 50000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.confessions ADD CONSTRAINT check_confession_content_length 
    CHECK (length(content) > 0 AND length(content) <= 5000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.confession_comments ADD CONSTRAINT check_confession_comment_length 
    CHECK (length(content) > 0 AND length(content) <= 3000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.anonymous_questions ADD CONSTRAINT check_question_length 
    CHECK (length(question) > 0 AND length(question) <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.announcement_comments ADD CONSTRAINT check_announcement_comment_length 
    CHECK (length(content) > 0 AND length(content) <= 3000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.bio_history ADD CONSTRAINT check_bio_content_length 
    CHECK (length(content) <= 2000);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- PROFILES SENSITIVE DATA - Create secure function
CREATE OR REPLACE FUNCTION public.get_safe_profile(target_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  username TEXT,
  age INTEGER,
  gender TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  last_seen TIMESTAMPTZ,
  is_approved BOOLEAN,
  is_online BOOLEAN,
  theme TEXT,
  login_email TEXT,
  last_ip_address TEXT,
  password_changed_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calling_user_id UUID := auth.uid();
  is_admin BOOLEAN := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = calling_user_id
    AND role IN ('admin', 'super_admin')
  ) INTO is_admin;

  IF calling_user_id = target_user_id OR is_admin THEN
    RETURN QUERY
    SELECT p.id, p.user_id, p.username, p.age, p.gender, p.avatar_url, p.cover_url,
           p.created_at, p.updated_at, p.last_seen, p.is_approved, p.is_online, p.theme,
           p.login_email, p.last_ip_address, p.password_changed_at
    FROM public.profiles p
    WHERE p.user_id = target_user_id;
  ELSE
    RETURN QUERY
    SELECT p.id, p.user_id, p.username, p.age, p.gender, p.avatar_url, p.cover_url,
           p.created_at, p.updated_at, p.last_seen, p.is_approved, p.is_online, p.theme,
           NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ
    FROM public.profiles p
    WHERE p.user_id = target_user_id;
  END IF;
END;
$$;
