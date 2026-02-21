
-- Create enum for audience types
CREATE TYPE public.system_message_audience AS ENUM (
  'everyone',
  'active_7d',
  'active_3d',
  'admins',
  'girls',
  'boys'
);

-- Create enum for message status
CREATE TYPE public.system_message_status AS ENUM (
  'draft',
  'sent'
);

-- Create system_messages table
CREATE TABLE public.system_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  body TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::JSONB,
  audience_type system_message_audience NOT NULL DEFAULT 'everyone',
  allow_user_delete BOOLEAN NOT NULL DEFAULT false,
  pin_until_open BOOLEAN NOT NULL DEFAULT true,
  status system_message_status NOT NULL DEFAULT 'draft',
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create system_message_deliveries table
CREATE TABLE public.system_message_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.system_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT true,
  opened_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_system_message_deliveries_user_pinned ON public.system_message_deliveries(user_id, pinned, opened_at, deleted_at);
CREATE INDEX idx_system_messages_status_sent ON public.system_messages(status, sent_at);
CREATE INDEX idx_system_message_deliveries_message ON public.system_message_deliveries(message_id);

-- Enable RLS
ALTER TABLE public.system_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_message_deliveries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_messages (Super Admin only for write operations)
CREATE POLICY "Super admins can manage system messages"
ON public.system_messages
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- RLS Policies for system_message_deliveries
-- Super admins can see all deliveries
CREATE POLICY "Super admins can view all deliveries"
ON public.system_message_deliveries
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Users can see their own deliveries (not deleted)
CREATE POLICY "Users can view their own deliveries"
ON public.system_message_deliveries
FOR SELECT
TO authenticated
USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Users can update their own deliveries (for marking as opened)
CREATE POLICY "Users can update their own deliveries"
ON public.system_message_deliveries
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Super admins can insert deliveries
CREATE POLICY "Super admins can insert deliveries"
ON public.system_message_deliveries
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- Super admins can delete deliveries
CREATE POLICY "Super admins can delete deliveries"
ON public.system_message_deliveries
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to send system message to targeted audience
CREATE OR REPLACE FUNCTION public.send_system_message(p_message_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_message RECORD;
  v_inserted INTEGER := 0;
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

  -- Insert deliveries based on audience type
  INSERT INTO public.system_message_deliveries (message_id, user_id, pinned)
  SELECT 
    p_message_id,
    p.user_id,
    v_message.pin_until_open
  FROM public.profiles p
  WHERE 
    CASE v_message.audience_type
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
  ON CONFLICT (message_id, user_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

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
    jsonb_build_object('audience', v_message.audience_type, 'recipients', v_inserted)
  );

  RETURN v_inserted;
END;
$$;

-- Function to mark system message as opened (unpins it)
CREATE OR REPLACE FUNCTION public.open_system_message(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.system_message_deliveries
  SET 
    opened_at = COALESCE(opened_at, now()),
    pinned = false
  WHERE id = p_delivery_id AND user_id = auth.uid();

  RETURN FOUND;
END;
$$;

-- Function to delete system message for user (soft delete)
CREATE OR REPLACE FUNCTION public.delete_system_message_for_user(p_delivery_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_allow_delete BOOLEAN;
BEGIN
  -- Check if deletion is allowed for this message
  SELECT sm.allow_user_delete INTO v_allow_delete
  FROM public.system_message_deliveries smd
  JOIN public.system_messages sm ON sm.id = smd.message_id
  WHERE smd.id = p_delivery_id AND smd.user_id = auth.uid();

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF NOT v_allow_delete THEN
    RAISE EXCEPTION 'Deletion not allowed for this message';
  END IF;

  UPDATE public.system_message_deliveries
  SET deleted_at = now()
  WHERE id = p_delivery_id AND user_id = auth.uid();

  RETURN TRUE;
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_system_messages_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_system_messages_updated_at_trigger
BEFORE UPDATE ON public.system_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_system_messages_updated_at();

-- Create storage bucket for system message attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'system-attachments',
  'system-attachments',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/mp4', 'audio/wav']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for system attachments
CREATE POLICY "Super admins can upload system attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'system-attachments' 
  AND public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Anyone can view system attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'system-attachments');

CREATE POLICY "Super admins can delete system attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'system-attachments' 
  AND public.has_role(auth.uid(), 'super_admin')
);
