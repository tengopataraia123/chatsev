-- Simple delete function without COMMIT (not allowed in function)
CREATE OR REPLACE FUNCTION public.delete_old_private_messages_batch(cutoff_date TIMESTAMPTZ, batch_limit INT DEFAULT 100)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM public.private_messages
  WHERE id IN (
    SELECT id FROM public.private_messages
    WHERE created_at < cutoff_date
    ORDER BY created_at ASC
    LIMIT batch_limit
  );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;