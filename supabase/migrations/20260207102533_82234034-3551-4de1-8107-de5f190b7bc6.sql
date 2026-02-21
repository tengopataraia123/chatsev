-- Fix send_system_message function to properly insert ALL users using batched approach
CREATE OR REPLACE FUNCTION public.send_system_message(p_message_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message RECORD;
  v_inserted INTEGER := 0;
  v_batch_size INTEGER := 500;
  v_offset INTEGER := 0;
  v_batch_count INTEGER;
  v_total_count INTEGER := 0;
BEGIN
  -- Check if caller is super admin
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied - Super Admin only';
  END IF;

  -- Get the message
  SELECT * INTO v_message
  FROM public.system_messages
  WHERE id = p_message_id AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Message not found or already sent';
  END IF;

  -- Get total count first for the audience
  SELECT COUNT(*)::INTEGER INTO v_total_count
  FROM public.profiles p
  WHERE 
    (p.is_site_banned IS NULL OR p.is_site_banned = false)
    AND CASE v_message.audience_type
      WHEN 'everyone' THEN true
      WHEN 'active_7d' THEN p.last_seen >= now() - INTERVAL '7 days'
      WHEN 'active_3d' THEN p.last_seen >= now() - INTERVAL '3 days'
      WHEN 'admins' THEN EXISTS (
        SELECT 1 FROM public.user_roles ur 
        WHERE ur.user_id = p.user_id 
        AND ur.role IN ('admin', 'moderator', 'super_admin')
      )
      WHEN 'girls' THEN p.gender = 'female'
      WHEN 'boys' THEN p.gender = 'male'
      ELSE false
    END;

  -- Insert in batches to avoid row limits
  LOOP
    WITH batch_users AS (
      SELECT p.user_id
      FROM public.profiles p
      WHERE 
        (p.is_site_banned IS NULL OR p.is_site_banned = false)
        AND CASE v_message.audience_type
          WHEN 'everyone' THEN true
          WHEN 'active_7d' THEN p.last_seen >= now() - INTERVAL '7 days'
          WHEN 'active_3d' THEN p.last_seen >= now() - INTERVAL '3 days'
          WHEN 'admins' THEN EXISTS (
            SELECT 1 FROM public.user_roles ur 
            WHERE ur.user_id = p.user_id 
            AND ur.role IN ('admin', 'moderator', 'super_admin')
          )
          WHEN 'girls' THEN p.gender = 'female'
          WHEN 'boys' THEN p.gender = 'male'
          ELSE false
        END
      ORDER BY p.user_id
      LIMIT v_batch_size
      OFFSET v_offset
    )
    INSERT INTO public.system_message_deliveries (message_id, user_id, pinned)
    SELECT 
      p_message_id,
      bu.user_id,
      v_message.pin_until_open
    FROM batch_users bu
    ON CONFLICT (message_id, user_id) DO NOTHING;

    GET DIAGNOSTICS v_batch_count = ROW_COUNT;
    v_inserted := v_inserted + v_batch_count;
    v_offset := v_offset + v_batch_size;

    -- Exit if we've processed all users or no more batches
    EXIT WHEN v_offset >= v_total_count OR v_batch_count = 0;
  END LOOP;

  -- Update message status
  UPDATE public.system_messages
  SET status = 'sent', sent_at = now(), updated_at = now()
  WHERE id = p_message_id;

  -- Log admin action
  INSERT INTO public.admin_action_logs (
    admin_id, admin_role, action_type, action_category,
    target_content_id, target_content_type, description,
    metadata
  ) VALUES (
    auth.uid(),
    'super_admin',
    'other',
    'moderation',
    p_message_id::TEXT,
    'system_message',
    format('Sent system message to %s recipients (%s)', v_inserted, v_message.audience_type),
    jsonb_build_object('audience', v_message.audience_type, 'recipients', v_inserted, 'total_eligible', v_total_count)
  );

  RETURN v_inserted;
END;
$$;