
CREATE OR REPLACE FUNCTION public.bulk_delete_private_messages(
  p_cutoff_date timestamptz,
  p_batch_size int DEFAULT 500
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int := 0;
  batch_deleted int;
  max_iterations int := 20;
  i int := 0;
BEGIN
  -- Disable the trigger that updates conversation timestamps on each delete
  ALTER TABLE private_messages DISABLE TRIGGER trigger_update_conversation_timestamp;
  
  LOOP
    i := i + 1;
    EXIT WHEN i > max_iterations;
    
    DELETE FROM private_messages 
    WHERE id IN (
      SELECT id FROM private_messages 
      WHERE created_at < p_cutoff_date 
      LIMIT p_batch_size
    );
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < p_batch_size;
  END LOOP;
  
  -- Re-enable the trigger
  ALTER TABLE private_messages ENABLE TRIGGER trigger_update_conversation_timestamp;
  
  RETURN deleted_count;
END;
$$;
