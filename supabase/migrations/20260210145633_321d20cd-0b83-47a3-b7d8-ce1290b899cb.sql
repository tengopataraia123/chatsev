CREATE OR REPLACE FUNCTION public.bulk_cleanup_table(
  p_table_name TEXT,
  p_date_column TEXT,
  p_cutoff_date TIMESTAMPTZ,
  p_batch_size INT DEFAULT 500
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '45s'
AS $$
DECLARE
  v_deleted INT := 0;
  v_batch INT;
  v_iterations INT := 0;
  v_max_iterations INT := 5;
BEGIN
  -- Disable only USER triggers (not system/constraint triggers)
  EXECUTE format('ALTER TABLE %I DISABLE TRIGGER USER', p_table_name);
  
  LOOP
    EXIT WHEN v_iterations >= v_max_iterations;
    v_iterations := v_iterations + 1;
    
    EXECUTE format(
      'DELETE FROM %I WHERE ctid IN (SELECT ctid FROM %I WHERE %I < $1 LIMIT $2)',
      p_table_name, p_table_name, p_date_column
    ) USING p_cutoff_date, p_batch_size;
    
    GET DIAGNOSTICS v_batch = ROW_COUNT;
    v_deleted := v_deleted + v_batch;
    
    EXIT WHEN v_batch < p_batch_size;
  END LOOP;
  
  -- Re-enable user triggers
  EXECUTE format('ALTER TABLE %I ENABLE TRIGGER USER', p_table_name);
  
  RETURN jsonb_build_object(
    'deleted', v_deleted,
    'hasMore', v_iterations >= v_max_iterations
  );
EXCEPTION WHEN OTHERS THEN
  EXECUTE format('ALTER TABLE %I ENABLE TRIGGER USER', p_table_name);
  RAISE;
END;
$$;