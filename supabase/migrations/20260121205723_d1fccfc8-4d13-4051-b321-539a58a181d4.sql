CREATE OR REPLACE FUNCTION public.sync_post_approval_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status = 'pending' AND 
     NEW.type IN ('post', 'post_image', 'post_video') AND 
     NEW.content_id IS NOT NULL THEN
    UPDATE public.posts SET is_approved = true WHERE id = NEW.content_id;
  END IF;
  RETURN NEW;
END;
$$