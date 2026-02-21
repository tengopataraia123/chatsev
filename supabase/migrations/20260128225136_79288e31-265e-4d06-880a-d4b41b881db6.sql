-- Create trigger to sync post approval status
DROP TRIGGER IF EXISTS trigger_sync_post_approval ON public.pending_approvals;

CREATE TRIGGER trigger_sync_post_approval
  AFTER UPDATE ON public.pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_approval_status();