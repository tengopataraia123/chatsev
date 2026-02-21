-- Create function for batch delete of old private messages
CREATE OR REPLACE FUNCTION public.delete_old_private_messages(cutoff_date TIMESTAMPTZ, batch_limit INT DEFAULT 500)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT := 0;
  batch_deleted INT;
BEGIN
  LOOP
    WITH to_delete AS (
      SELECT id FROM public.private_messages
      WHERE created_at < cutoff_date
      LIMIT batch_limit
    )
    DELETE FROM public.private_messages
    WHERE id IN (SELECT id FROM to_delete);
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < batch_limit;
    
    -- Small pause to avoid overloading
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Create function for batch delete of old group messages
CREATE OR REPLACE FUNCTION public.delete_old_group_messages(cutoff_date TIMESTAMPTZ, batch_limit INT DEFAULT 500)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT := 0;
  batch_deleted INT;
BEGIN
  LOOP
    WITH to_delete AS (
      SELECT id FROM public.group_chat_messages
      WHERE created_at < cutoff_date
      LIMIT batch_limit
    )
    DELETE FROM public.group_chat_messages
    WHERE id IN (SELECT id FROM to_delete);
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < batch_limit;
    
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Create function for batch delete of old message reads
CREATE OR REPLACE FUNCTION public.delete_old_message_reads(cutoff_date TIMESTAMPTZ, batch_limit INT DEFAULT 500)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT := 0;
  batch_deleted INT;
BEGIN
  LOOP
    WITH to_delete AS (
      SELECT id FROM public.group_chat_message_reads
      WHERE seen_at < cutoff_date
      LIMIT batch_limit
    )
    DELETE FROM public.group_chat_message_reads
    WHERE id IN (SELECT id FROM to_delete);
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < batch_limit;
    
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Create function for batch delete of old profile visits
CREATE OR REPLACE FUNCTION public.delete_old_profile_visits(cutoff_date TIMESTAMPTZ, batch_limit INT DEFAULT 500)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT := 0;
  batch_deleted INT;
BEGIN
  LOOP
    WITH to_delete AS (
      SELECT id FROM public.profile_visits
      WHERE visited_at < cutoff_date
      LIMIT batch_limit
    )
    DELETE FROM public.profile_visits
    WHERE id IN (SELECT id FROM to_delete);
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < batch_limit;
    
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RETURN deleted_count;
END;
$$;

-- Create function for batch delete of old notifications
CREATE OR REPLACE FUNCTION public.delete_old_notifications(cutoff_date TIMESTAMPTZ, batch_limit INT DEFAULT 500)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INT := 0;
  batch_deleted INT;
BEGIN
  LOOP
    WITH to_delete AS (
      SELECT id FROM public.notifications
      WHERE created_at < cutoff_date
      LIMIT batch_limit
    )
    DELETE FROM public.notifications
    WHERE id IN (SELECT id FROM to_delete);
    
    GET DIAGNOSTICS batch_deleted = ROW_COUNT;
    deleted_count := deleted_count + batch_deleted;
    
    EXIT WHEN batch_deleted < batch_limit;
    
    PERFORM pg_sleep(0.1);
  END LOOP;
  
  RETURN deleted_count;
END;
$$;