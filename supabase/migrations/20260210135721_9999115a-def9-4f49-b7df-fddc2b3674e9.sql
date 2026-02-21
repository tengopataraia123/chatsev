
-- Drop old function if exists
DROP FUNCTION IF EXISTS public.batch_delete_old_records(text, text, timestamptz, integer);

-- Create a powerful cleanup function that disables triggers during deletion
CREATE OR REPLACE FUNCTION public.bulk_cleanup_table(
  p_table_name text,
  p_date_column text,
  p_cutoff_date timestamptz,
  p_batch_size integer DEFAULT 5000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '120s'
SET search_path = public
AS $$
DECLARE
  v_total_deleted bigint := 0;
  v_batch_deleted bigint;
  v_max_iterations integer := 200;
  v_iteration integer := 0;
  v_has_more boolean := false;
  v_remaining bigint;
BEGIN
  -- Validate table name (whitelist only)
  IF p_table_name NOT IN (
    'private_messages', 'group_chat_messages', 
    'group_chat_message_reads', 'profile_visits', 'notifications'
  ) THEN
    RETURN jsonb_build_object('error', 'Invalid table name', 'deleted', 0);
  END IF;

  -- Validate date column
  IF p_date_column NOT IN ('created_at', 'seen_at', 'visited_at') THEN
    RETURN jsonb_build_object('error', 'Invalid date column', 'deleted', 0);
  END IF;

  -- Disable ALL triggers on the table temporarily
  EXECUTE format('ALTER TABLE %I DISABLE TRIGGER ALL', p_table_name);
  
  BEGIN
    -- Delete in batches
    LOOP
      v_iteration := v_iteration + 1;
      EXIT WHEN v_iteration > v_max_iterations;
      
      EXECUTE format(
        'DELETE FROM %I WHERE id IN (SELECT id FROM %I WHERE %I < $1 LIMIT $2)',
        p_table_name, p_table_name, p_date_column
      ) USING p_cutoff_date, p_batch_size;
      
      GET DIAGNOSTICS v_batch_deleted = ROW_COUNT;
      v_total_deleted := v_total_deleted + v_batch_deleted;
      
      -- Log progress every 10 iterations
      IF v_iteration % 10 = 0 THEN
        RAISE NOTICE '% cleanup: deleted % so far (iteration %)', p_table_name, v_total_deleted, v_iteration;
      END IF;
      
      -- If batch was smaller than limit, we're done
      EXIT WHEN v_batch_deleted < p_batch_size;
    END LOOP;
    
    -- Check remaining
    EXECUTE format('SELECT count(*) FROM %I WHERE %I < $1', p_table_name, p_date_column)
    INTO v_remaining USING p_cutoff_date;
    
    v_has_more := v_remaining > 0;
    
  EXCEPTION WHEN OTHERS THEN
    -- Re-enable triggers even on error
    EXECUTE format('ALTER TABLE %I ENABLE TRIGGER ALL', p_table_name);
    RAISE;
  END;
  
  -- Re-enable ALL triggers
  EXECUTE format('ALTER TABLE %I ENABLE TRIGGER ALL', p_table_name);
  
  RETURN jsonb_build_object(
    'deleted', v_total_deleted,
    'hasMore', v_has_more,
    'remaining', v_remaining,
    'iterations', v_iteration
  );
END;
$$;
