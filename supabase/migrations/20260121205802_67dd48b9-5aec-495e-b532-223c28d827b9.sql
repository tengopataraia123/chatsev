CREATE TRIGGER trigger_sync_post_approval
  AFTER UPDATE ON public.pending_approvals
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_post_approval_status()