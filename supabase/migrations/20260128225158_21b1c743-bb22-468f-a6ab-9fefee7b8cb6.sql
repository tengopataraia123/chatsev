-- Ensure trigger exists on pending_approvals for syncing post approval
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
$$;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_sync_post_approval ON public.pending_approvals;
CREATE TRIGGER trigger_sync_post_approval
  AFTER UPDATE OF status ON public.pending_approvals
  FOR EACH ROW
  WHEN (NEW.status = 'approved' AND OLD.status = 'pending')
  EXECUTE FUNCTION public.sync_post_approval_status();