
CREATE OR REPLACE FUNCTION public.batch_delete_old_records(
  p_table_name text,
  p_date_column text,
  p_cutoff_date timestamptz,
  p_batch_size int DEFAULT 1000
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count int := 0;
  batch_deleted int;
BEGIN
  -- Validate table name to prevent SQL injection
  IF p_table_name NOT IN ('private_messages', 'group_chat_messages', 'group_chat_message_reads', 'profile_visits', 'notifications') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;
  
  -- Validate date column
  IF p_date_column NOT IN ('created_at', 'seen_at', 'visited_at') THEN
    RAISE EXCEPTION 'Invalid date column: %', p_date_column;
  END IF;

  LOOP
    EXECUTE format(
      'DELETE FROM %I WHERE id IN (SELECT id FROM %I WHERE %I < $1 LIMIT $2)',
      p_table_name, p_table_name, p_date_column
    ) USING p_cutoff_date, p_batch_size;
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < p_batch_size;
    
    -- Small pause between batches
    PERFORM pg_sleep(0.05);
  END LOOP;
  
  RETURN deleted_count;
END;
$$;
