-- Add index for faster cleanup queries
CREATE INDEX IF NOT EXISTS idx_private_messages_created_at ON public.private_messages (created_at);

-- Rewrite function: no trigger toggling, just small fast deletes
CREATE OR REPLACE FUNCTION public.bulk_cleanup_table(
  p_table_name TEXT,
  p_date_column TEXT,
  p_cutoff_date TIMESTAMPTZ,
  p_batch_size INT DEFAULT 200
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '30s'
SET search_path = public
AS $$
DECLARE
  v_deleted INT := 0;
  v_batch INT;
  v_iterations INT := 0;
  v_max_iterations INT := 10;
BEGIN
  LOOP
    EXIT WHEN v_iterations >= v_max_iterations;
    v_iterations := v_iterations + 1;
    
    EXECUTE format(
      'DELETE FROM %I WHERE ctid = ANY(ARRAY(SELECT ctid FROM %I WHERE %I < $1 LIMIT $2))',
      p_table_name, p_table_name, p_date_column
    ) USING p_cutoff_date, p_batch_size;
    
    GET DIAGNOSTICS v_batch = ROW_COUNT;
    v_deleted := v_deleted + v_batch;
    
    EXIT WHEN v_batch < p_batch_size;
  END LOOP;
  
  RETURN jsonb_build_object(
    'deleted', v_deleted,
    'hasMore', v_iterations >= v_max_iterations
  );
END;
$$;