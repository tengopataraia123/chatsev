-- Fix the instant_clear_room function to use WHERE TRUE
DROP FUNCTION IF EXISTS public.instant_clear_room(text);

CREATE OR REPLACE FUNCTION public.instant_clear_room(room_table text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count bigint;
BEGIN
  -- Execute dynamic SQL to delete all messages from the specified table
  -- Using WHERE TRUE to satisfy PostgREST requirement
  EXECUTE format('DELETE FROM %I WHERE TRUE', room_table);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.instant_clear_room(text) TO authenticated;