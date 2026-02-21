-- Fix end_relationship function to include from_user_id in all notifications
CREATE OR REPLACE FUNCTION public.end_relationship()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_partner_id UUID;
BEGIN
  -- Get partner id
  SELECT partner_id INTO v_partner_id
  FROM public.relationship_statuses
  WHERE user_id = auth.uid() AND partner_id IS NOT NULL;
  
  IF v_partner_id IS NULL THEN
    RAISE EXCEPTION 'No active relationship found';
  END IF;
  
  -- Clear own status
  UPDATE public.relationship_statuses
  SET status = 'single', partner_id = NULL, relationship_started_at = NULL, updated_at = now()
  WHERE user_id = auth.uid();
  
  -- Clear partner's status
  UPDATE public.relationship_statuses
  SET status = 'single', partner_id = NULL, relationship_started_at = NULL, updated_at = now()
  WHERE user_id = v_partner_id;
  
  -- Notify partner
  INSERT INTO public.notifications (user_id, type, message, from_user_id)
  VALUES (
    v_partner_id,
    'relationship_ended',
    'ურთიერთობა დასრულებულია',
    auth.uid()
  );
  
  -- Notify self (also include from_user_id)
  INSERT INTO public.notifications (user_id, type, message, from_user_id)
  VALUES (
    auth.uid(),
    'relationship_ended',
    'თქვენ დაასრულეთ ურთიერთობა',
    v_partner_id
  );
  
  RETURN TRUE;
END;
$$;