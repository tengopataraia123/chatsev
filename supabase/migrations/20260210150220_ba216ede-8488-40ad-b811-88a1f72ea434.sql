CREATE OR REPLACE FUNCTION public.bulk_cleanup_table(
  p_table_name TEXT,
  p_date_column TEXT,
  p_cutoff_date TIMESTAMPTZ,
  p_batch_size INT DEFAULT 100
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout = '25s'
SET search_path = public
AS $$
DECLARE
  v_deleted INT := 0;
  v_sql TEXT;
BEGIN
  v_sql := format(
    'DELETE FROM %I WHERE id IN (SELECT id FROM %I WHERE %I < $1 ORDER BY %I LIMIT $2)',
    p_table_name, p_table_name, p_date_column, p_date_column
  );
  
  EXECUTE v_sql USING p_cutoff_date, p_batch_size;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  
  RETURN jsonb_build_object(
    'deleted', v_deleted,
    'hasMore', v_deleted >= p_batch_size
  );
END;
$$;