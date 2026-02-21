-- Add global pin columns to posts table
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS is_globally_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS globally_pinned_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS globally_pinned_by UUID REFERENCES auth.users(id) DEFAULT NULL;

-- Create index for efficient pinned post queries
CREATE INDEX IF NOT EXISTS idx_posts_globally_pinned ON public.posts (is_globally_pinned) WHERE is_globally_pinned = true;

-- Function to pin a post globally (auto-unpins previous)
CREATE OR REPLACE FUNCTION public.pin_post_globally(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super_admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only Super Admins can pin posts globally';
  END IF;
  
  -- Unpin all currently pinned posts
  UPDATE public.posts 
  SET is_globally_pinned = false, 
      globally_pinned_at = NULL,
      globally_pinned_by = NULL
  WHERE is_globally_pinned = true;
  
  -- Pin the new post
  UPDATE public.posts 
  SET is_globally_pinned = true, 
      globally_pinned_at = now(),
      globally_pinned_by = auth.uid()
  WHERE id = p_post_id;
  
  -- Log the action
  INSERT INTO public.admin_action_logs (
    admin_id,
    admin_role,
    action_type,
    action_category,
    target_content_id,
    target_content_type,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'super_admin',
    'other',
    'content',
    p_post_id::text,
    'post',
    'Pinned post globally',
    jsonb_build_object('action', 'pin_globally', 'post_id', p_post_id)
  );
  
  RETURN TRUE;
END;
$$;

-- Function to unpin a post globally
CREATE OR REPLACE FUNCTION public.unpin_post_globally(p_post_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super_admin
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ) INTO v_is_super_admin;
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only Super Admins can unpin posts globally';
  END IF;
  
  -- Unpin the post
  UPDATE public.posts 
  SET is_globally_pinned = false, 
      globally_pinned_at = NULL,
      globally_pinned_by = NULL
  WHERE id = p_post_id;
  
  -- Log the action
  INSERT INTO public.admin_action_logs (
    admin_id,
    admin_role,
    action_type,
    action_category,
    target_content_id,
    target_content_type,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    'super_admin',
    'other',
    'content',
    p_post_id::text,
    'post',
    'Unpinned post globally',
    jsonb_build_object('action', 'unpin_globally', 'post_id', p_post_id)
  );
  
  RETURN TRUE;
END;
$$;

-- Function to get the currently pinned post
CREATE OR REPLACE FUNCTION public.get_globally_pinned_post()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  created_at TIMESTAMPTZ,
  globally_pinned_at TIMESTAMPTZ,
  globally_pinned_by UUID,
  location_name TEXT,
  location_full TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_source TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.user_id,
    p.content,
    p.image_url,
    p.video_url,
    p.created_at,
    p.globally_pinned_at,
    p.globally_pinned_by,
    p.location_name,
    p.location_full,
    p.location_lat,
    p.location_lng,
    p.location_source
  FROM public.posts p
  WHERE p.is_globally_pinned = true
  AND p.is_approved = true
  LIMIT 1;
$$;

-- Trigger to auto-unpin when post is deleted
CREATE OR REPLACE FUNCTION public.handle_pinned_post_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If the deleted post was pinned, log it
  IF OLD.is_globally_pinned = true THEN
    INSERT INTO public.admin_action_logs (
      admin_id,
      admin_role,
      action_type,
      action_category,
      target_content_id,
      target_content_type,
      description,
      metadata
    ) VALUES (
      COALESCE(auth.uid(), OLD.globally_pinned_by),
      'super_admin',
      'delete',
      'content',
      OLD.id::text,
      'post',
      'Pinned post was deleted (auto-unpinned)',
      jsonb_build_object('action', 'auto_unpin_on_delete', 'post_id', OLD.id)
    );
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_pinned_post_delete ON public.posts;
CREATE TRIGGER on_pinned_post_delete
BEFORE DELETE ON public.posts
FOR EACH ROW
WHEN (OLD.is_globally_pinned = true)
EXECUTE FUNCTION public.handle_pinned_post_deletion();