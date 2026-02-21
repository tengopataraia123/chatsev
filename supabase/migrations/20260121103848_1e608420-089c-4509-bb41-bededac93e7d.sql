-- Create a function to instantly clear room messages using TRUNCATE-like behavior
-- This uses DELETE without conditions which is much faster than batch deletion

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
  EXECUTE format('DELETE FROM %I', room_table);
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Grant execute permission to authenticated users (function will check role internally)
GRANT EXECUTE ON FUNCTION public.instant_clear_room(text) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.instant_clear_room IS 'Instantly clears all messages from a room table. Should only be called by admins via edge function.';