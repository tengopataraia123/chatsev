
-- Update end_relationship to include partner username in notification
CREATE OR REPLACE FUNCTION public.end_relationship()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
  v_my_username TEXT;
  v_partner_username TEXT;
BEGIN
  -- Get partner id
  SELECT partner_id INTO v_partner_id
  FROM public.relationship_statuses
  WHERE user_id = auth.uid() AND partner_id IS NOT NULL;
  
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'No active relationship found';
  END IF;
  
  -- Get usernames
  SELECT username INTO v_my_username FROM public.profiles WHERE id = auth.uid();
  SELECT username INTO v_partner_username FROM public.profiles WHERE id = v_partner_id;
  
  -- Clear own status
  UPDATE public.relationship_statuses
  SET status = 'single', partner_id = NULL, relationship_started_at = NULL, updated_at = now()
  WHERE user_id = auth.uid();
  
  -- Clear partner's status
  UPDATE public.relationship_statuses
  SET status = 'single', partner_id = NULL, relationship_started_at = NULL, updated_at = now()
  WHERE user_id = v_partner_id;
  
  -- Notify partner with specific message
  INSERT INTO public.notifications (user_id, type, message, from_user_id)
  VALUES (
    v_partner_id,
    'relationship_ended',
    '💔 ' || COALESCE(v_my_username, 'მომხმარებელმა') || '-მ შეწყვიტა ურთიერთობა თქვენთან',
    auth.uid()
  );
  
  -- Notify self
  INSERT INTO public.notifications (user_id, type, message, from_user_id)
  VALUES (
    auth.uid(),
    'relationship_ended',
    '💔 თქვენ შეწყვიტეთ ურთიერთობა ' || COALESCE(v_partner_username, 'მომხმარებელთან'),
    v_partner_id
  );
  
  RETURN TRUE;
END;
$$;
