
CREATE OR REPLACE FUNCTION public.batch_delete_old_records(
  p_table_name text,
  p_date_column text,
  p_cutoff_date timestamptz,
  p_batch_size int DEFAULT 500
)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
SET statement_timeout = '55s'
AS $$
DECLARE
  deleted_count int := 0;
  batch_deleted int;
  max_iterations int := 20;
  i int := 0;
BEGIN
  -- Validate table name
  IF p_table_name NOT IN ('private_messages', 'group_chat_messages', 'group_chat_message_reads', 'profile_visits', 'notifications') THEN
    RAISE EXCEPTION 'Invalid table name: %', p_table_name;
  END IF;
  
  IF p_date_column NOT IN ('created_at', 'seen_at', 'visited_at') THEN
    RAISE EXCEPTION 'Invalid date column: %', p_date_column;
  END IF;

  LOOP
    i := i + 1;
    EXIT WHEN i > max_iterations;
    
    EXECUTE format(
      'DELETE FROM %I WHERE id IN (SELECT id FROM %I WHERE %I < $1 LIMIT $2)',
      p_table_name, p_table_name, p_date_column
    ) USING p_cutoff_date, p_batch_size;
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < p_batch_size;
    
    PERFORM pg_sleep(0.02);
  END LOOP;
  
  RETURN deleted_count;
END;
$$;
