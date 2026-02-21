-- Create a function to clear all group chat messages (admin only)
CREATE OR REPLACE FUNCTION public.admin_clear_room_messages(room_table TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT := 0;
  batch_deleted INT;
  max_iterations INT := 100;
  iteration INT := 0;
BEGIN
  -- Check if user is admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied - Admin only';
  END IF;
  
  -- Delete in batches based on room type
  IF room_table = 'group_chat_messages' THEN
    LOOP
      iteration := iteration + 1;
      DELETE FROM public.group_chat_messages
      WHERE id IN (SELECT id FROM public.group_chat_messages LIMIT 500);
      GET DIAGNOSTICS batch_deleted = ROW_COUNT;
      deleted_count := deleted_count + batch_deleted;
      EXIT WHEN batch_deleted = 0 OR iteration >= max_iterations;
    END LOOP;
  ELSIF room_table = 'night_room_messages' THEN
    LOOP
      iteration := iteration + 1;
      DELETE FROM public.night_room_messages
      WHERE id IN (SELECT id FROM public.night_room_messages LIMIT 500);
      GET DIAGNOSTICS batch_deleted = ROW_COUNT;
      deleted_count := deleted_count + batch_deleted;
      EXIT WHEN batch_deleted = 0 OR iteration >= max_iterations;
    END LOOP;
  ELSIF room_table = 'emigrants_room_messages' THEN
    LOOP
      iteration := iteration + 1;
      DELETE FROM public.emigrants_room_messages
      WHERE id IN (SELECT id FROM public.emigrants_room_messages LIMIT 500);
      GET DIAGNOSTICS batch_deleted = ROW_COUNT;
      deleted_count := deleted_count + batch_deleted;
      EXIT WHEN batch_deleted = 0 OR iteration >= max_iterations;
    END LOOP;
  ELSIF room_table = 'dj_room_messages' THEN
    LOOP
      iteration := iteration + 1;
      DELETE FROM public.dj_room_messages
      WHERE id IN (SELECT id FROM public.dj_room_messages LIMIT 500);
      GET DIAGNOSTICS batch_deleted = ROW_COUNT;
      deleted_count := deleted_count + batch_deleted;
      EXIT WHEN batch_deleted = 0 OR iteration >= max_iterations;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'Invalid room table';
  END IF;
  
  RETURN deleted_count;
END;
$$;