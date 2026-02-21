-- Add index on created_at for faster deletion
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON public.private_messages(created_at);

-- Update delete function with much smaller batches
CREATE OR REPLACE FUNCTION public.delete_old_private_messages(cutoff_date TIMESTAMPTZ, batch_limit INT DEFAULT 100)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT := 0;
  batch_deleted INT;
  max_iterations INT := 50; -- Limit iterations to avoid infinite loop
  iteration INT := 0;
BEGIN
  LOOP
    iteration := iteration + 1;
    
    DELETE FROM public.private_messages
    WHERE id IN (
      SELECT id FROM public.private_messages
      WHERE created_at < cutoff_date
      ORDER BY created_at ASC
      LIMIT batch_limit
    );
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    -- Exit conditions
    EXIT WHEN batch_deleted = 0;
    EXIT WHEN iteration >= max_iterations;
    
    COMMIT;
  END LOOP;
  
  RETURN deleted_count;
END;
$$;