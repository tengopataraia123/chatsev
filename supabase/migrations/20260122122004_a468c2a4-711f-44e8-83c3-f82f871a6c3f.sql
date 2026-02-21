
-- Enable the welcome message trigger
ALTER TABLE public.profiles ENABLE TRIGGER trigger_send_welcome_message;

-- Create a function to send broadcast to all users without 1000 limit
CREATE OR REPLACE FUNCTION public.send_broadcast_to_all_active_users(
  p_broadcast_id UUID,
  p_days_active INTEGER DEFAULT 30
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted INTEGER := 0;
  v_batch_size INTEGER := 500;
  v_offset INTEGER := 0;
  v_batch_inserted INTEGER;
BEGIN
  -- Delete existing recipients for this broadcast to avoid duplicates
  DELETE FROM public.system_broadcast_recipients WHERE broadcast_id = p_broadcast_id;
  
  -- Insert in batches
  LOOP
    INSERT INTO public.system_broadcast_recipients (broadcast_id, user_id, delivery_status, delivered_at)
    SELECT p_broadcast_id, p.user_id, 'sent', now()
    FROM public.profiles p
    WHERE p.last_seen > now() - (p_days_active || ' days')::INTERVAL
    ORDER BY p.created_at
    LIMIT v_batch_size
    OFFSET v_offset
    ON CONFLICT DO NOTHING;
    
    GET DIAGNOSTICS v_batch_inserted = ROW_COUNT;
    v_inserted := v_inserted + v_batch_inserted;
    
    EXIT WHEN v_batch_inserted < v_batch_size;
    
    v_offset := v_offset + v_batch_size;
  END LOOP;
  
  RETURN v_inserted;
END;
$$;

-- Grant execute to authenticated users (for admin use)
GRANT EXECUTE ON FUNCTION public.send_broadcast_to_all_active_users TO authenticated;
