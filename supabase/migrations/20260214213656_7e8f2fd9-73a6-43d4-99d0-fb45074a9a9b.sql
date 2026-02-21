
-- Fix last remaining function without search_path
-- bulk_cleanup_table already has SET statement_timeout, need to add search_path
CREATE OR REPLACE FUNCTION public.bulk_cleanup_table(p_table_name text, p_date_column text, p_cutoff_date timestamp with time zone, p_batch_size integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET statement_timeout TO '10s'
SET search_path = public
AS $$
DECLARE
  v_deleted int;
  v_has_more boolean;
  v_allowed_tables text[] := ARRAY[
    'messenger_messages', 'messenger_group_messages', 'messenger_group_reads',
    'profile_visits', 'notifications', 'private_messages', 'group_chat_messages'
  ];
BEGIN
  IF NOT (p_table_name = ANY(v_allowed_tables)) THEN
    RAISE EXCEPTION 'Table not allowed: %', p_table_name;
  END IF;

  IF p_batch_size > 50 THEN
    p_batch_size := 50;
  END IF;

  EXECUTE format(
    'WITH to_delete AS (
       SELECT id FROM %I WHERE %I < $1 ORDER BY %I LIMIT $2
     )
     DELETE FROM %I WHERE id IN (SELECT id FROM to_delete)',
    p_table_name, p_date_column, p_date_column, p_table_name
  ) USING p_cutoff_date, p_batch_size;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  EXECUTE format(
    'SELECT EXISTS(SELECT 1 FROM %I WHERE %I < $1 LIMIT 1)',
    p_table_name, p_date_column
  ) USING p_cutoff_date INTO v_has_more;

  RETURN jsonb_build_object('deleted', v_deleted, 'hasMore', v_has_more);
END;
$$;
