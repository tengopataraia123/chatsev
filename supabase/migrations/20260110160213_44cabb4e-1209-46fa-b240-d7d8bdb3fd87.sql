-- Fix the accept_relationship_request function to use correct notification columns
CREATE OR REPLACE FUNCTION public.accept_relationship_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Get the request
  SELECT * INTO v_request
  FROM public.relationship_requests
  WHERE id = request_id AND status = 'pending' AND receiver_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;
  
  -- Update request status
  UPDATE public.relationship_requests
  SET status = 'accepted', responded_at = v_now, updated_at = v_now
  WHERE id = request_id;
  
  -- Create or update relationship status for sender
  INSERT INTO public.relationship_statuses (user_id, status, partner_id, relationship_started_at)
  VALUES (v_request.sender_id, v_request.proposed_status, v_request.receiver_id, v_now)
  ON CONFLICT (user_id) DO UPDATE SET
    status = v_request.proposed_status,
    partner_id = v_request.receiver_id,
    relationship_started_at = v_now,
    updated_at = v_now;
  
  -- Create or update relationship status for receiver
  INSERT INTO public.relationship_statuses (user_id, status, partner_id, relationship_started_at)
  VALUES (v_request.receiver_id, v_request.proposed_status, v_request.sender_id, v_now)
  ON CONFLICT (user_id) DO UPDATE SET
    status = v_request.proposed_status,
    partner_id = v_request.sender_id,
    relationship_started_at = v_now,
    updated_at = v_now;
  
  -- Create notification for sender
  INSERT INTO public.notifications (user_id, type, message, from_user_id)
  VALUES (
    v_request.sender_id,
    'relationship_accepted',
    'თქვენი ურთიერთობის შეთავაზება მიიღეს',
    v_request.receiver_id
  );
  
  -- Create notification for receiver
  INSERT INTO public.notifications (user_id, type, message, from_user_id)
  VALUES (
    v_request.receiver_id,
    'relationship_accepted',
    'თქვენ დაადასტურეთ ურთიერთობა',
    v_request.sender_id
  );
  
  RETURN TRUE;
END;
$$;

-- Fix the reject_relationship_request function
CREATE OR REPLACE FUNCTION public.reject_relationship_request(request_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Get the request
  SELECT * INTO v_request
  FROM public.relationship_requests
  WHERE id = request_id AND status = 'pending' AND receiver_id = auth.uid();
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request not found or not pending';
  END IF;
  
  -- Update request status
  UPDATE public.relationship_requests
  SET status = 'rejected', responded_at = now(), updated_at = now()
  WHERE id = request_id;
  
  -- Create notification for sender
  INSERT INTO public.notifications (user_id, type, message, from_user_id)
  VALUES (
    v_request.sender_id,
    'relationship_rejected',
    'თქვენი ურთიერთობის შეთავაზება უარყოფილია',
    v_request.receiver_id
  );
  
  RETURN TRUE;
END;
$$;

-- Fix the end_relationship function
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
  
  -- Notify self
  INSERT INTO public.notifications (user_id, type, message)
  VALUES (
    auth.uid(),
    'relationship_ended',
    'თქვენ დაასრულეთ ურთიერთობა'
  );
  
  RETURN TRUE;
END;
$$;