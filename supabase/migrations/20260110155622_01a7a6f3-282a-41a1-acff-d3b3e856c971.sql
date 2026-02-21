-- Create relationship status types enum
CREATE TYPE relationship_status_type AS ENUM (
  'single',
  'in_relationship',
  'engaged',
  'married',
  'complicated',
  'separated',
  'divorced',
  'widowed',
  'secret'
);

-- Create relationship request status enum
CREATE TYPE relationship_request_status AS ENUM (
  'pending',
  'accepted',
  'rejected',
  'cancelled'
);

-- Create privacy level enum for relationship
CREATE TYPE relationship_privacy_level AS ENUM (
  'public',
  'friends',
  'only_me'
);

-- Create relationship_statuses table
CREATE TABLE public.relationship_statuses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  status relationship_status_type DEFAULT 'single',
  partner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  privacy_level relationship_privacy_level DEFAULT 'public',
  hide_partner_name BOOLEAN DEFAULT false,
  relationship_started_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create relationship_requests table
CREATE TABLE public.relationship_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  proposed_status relationship_status_type NOT NULL,
  message TEXT,
  status relationship_request_status DEFAULT 'pending',
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Ensure sender and receiver are different
  CONSTRAINT different_users CHECK (sender_id != receiver_id)
);

-- Create index for fast lookups
CREATE INDEX idx_relationship_statuses_user_id ON public.relationship_statuses(user_id);
CREATE INDEX idx_relationship_statuses_partner_id ON public.relationship_statuses(partner_id);
CREATE INDEX idx_relationship_requests_sender_id ON public.relationship_requests(sender_id);
CREATE INDEX idx_relationship_requests_receiver_id ON public.relationship_requests(receiver_id);
CREATE INDEX idx_relationship_requests_status ON public.relationship_requests(status);

-- Enable RLS
ALTER TABLE public.relationship_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relationship_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for relationship_statuses

-- Users can view their own status
CREATE POLICY "Users can view own relationship status"
ON public.relationship_statuses
FOR SELECT
USING (auth.uid() = user_id);

-- Users can view others' public status
CREATE POLICY "Users can view public relationship status"
ON public.relationship_statuses
FOR SELECT
USING (
  privacy_level = 'public'
  OR (privacy_level = 'friends' AND EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND ((requester_id = auth.uid() AND addressee_id = user_id)
      OR (addressee_id = auth.uid() AND requester_id = user_id))
  ))
  OR public.has_role(auth.uid(), 'admin')
);

-- Users can insert/update their own status
CREATE POLICY "Users can manage own relationship status"
ON public.relationship_statuses
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own relationship status"
ON public.relationship_statuses
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own relationship status"
ON public.relationship_statuses
FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for relationship_requests

-- Users can view requests they sent or received
CREATE POLICY "Users can view own relationship requests"
ON public.relationship_requests
FOR SELECT
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Users can create requests
CREATE POLICY "Users can send relationship requests"
ON public.relationship_requests
FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  -- Check sender doesn't already have an active partner
  AND NOT EXISTS (
    SELECT 1 FROM public.relationship_statuses
    WHERE user_id = auth.uid() AND partner_id IS NOT NULL
  )
  -- Check receiver doesn't already have an active partner
  AND NOT EXISTS (
    SELECT 1 FROM public.relationship_statuses
    WHERE user_id = receiver_id AND partner_id IS NOT NULL
  )
  -- Check no pending request already exists between these users
  AND NOT EXISTS (
    SELECT 1 FROM public.relationship_requests
    WHERE status = 'pending'
    AND ((sender_id = auth.uid() AND receiver_id = relationship_requests.receiver_id)
      OR (receiver_id = auth.uid() AND sender_id = relationship_requests.sender_id))
  )
  -- Check user is not blocked
  AND NOT EXISTS (
    SELECT 1 FROM public.user_blocks
    WHERE (blocker_id = receiver_id AND blocked_id = auth.uid())
      OR (blocker_id = auth.uid() AND blocked_id = receiver_id)
  )
);

-- Sender can cancel, receiver can accept/reject
CREATE POLICY "Users can update own relationship requests"
ON public.relationship_requests
FOR UPDATE
USING (
  (auth.uid() = sender_id AND status = 'pending')
  OR (auth.uid() = receiver_id AND status = 'pending')
);

-- Create function to handle relationship request acceptance
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
  INSERT INTO public.notifications (user_id, type, title, content, sender_id, action_url)
  VALUES (
    v_request.sender_id,
    'relationship_accepted',
    'ურთიერთობა დადასტურდა',
    'თქვენი ურთიერთობის შეთავაზება მიიღეს',
    v_request.receiver_id,
    '/profile/' || v_request.receiver_id
  );
  
  -- Create notification for receiver
  INSERT INTO public.notifications (user_id, type, title, content, sender_id, action_url)
  VALUES (
    v_request.receiver_id,
    'relationship_accepted',
    'ურთიერთობა დადასტურდა',
    'თქვენ დაადასტურეთ ურთიერთობა',
    v_request.sender_id,
    '/profile/' || v_request.sender_id
  );
  
  RETURN TRUE;
END;
$$;

-- Create function to reject relationship request
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
  INSERT INTO public.notifications (user_id, type, title, content, sender_id)
  VALUES (
    v_request.sender_id,
    'relationship_rejected',
    'შეთავაზება უარყოფილია',
    'თქვენი ურთიერთობის შეთავაზება უარყოფილია',
    v_request.receiver_id
  );
  
  RETURN TRUE;
END;
$$;

-- Create function to end relationship
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
  
  -- Notify both users
  INSERT INTO public.notifications (user_id, type, title, content, sender_id)
  VALUES (
    v_partner_id,
    'relationship_ended',
    'ურთიერთობა დასრულდა',
    'ურთიერთობა დასრულებულია',
    auth.uid()
  );
  
  INSERT INTO public.notifications (user_id, type, title, content)
  VALUES (
    auth.uid(),
    'relationship_ended',
    'ურთიერთობა დასრულდა',
    'თქვენ დაასრულეთ ურთიერთობა'
  );
  
  RETURN TRUE;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_relationship_statuses_updated_at
BEFORE UPDATE ON public.relationship_statuses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_relationship_requests_updated_at
BEFORE UPDATE ON public.relationship_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.relationship_requests;