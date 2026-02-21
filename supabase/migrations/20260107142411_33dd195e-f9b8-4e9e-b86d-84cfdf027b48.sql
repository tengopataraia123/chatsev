-- Create audit log table for admin/moderator message overrides
CREATE TABLE public.admin_message_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL,
  receiver_id UUID NOT NULL,
  conversation_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'pm_override',
  metadata JSONB DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_message_audit ENABLE ROW LEVEL SECURITY;

-- Only super_admin can read audit logs
CREATE POLICY "Super admins can view audit logs"
ON public.admin_message_audit
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow insert from authenticated users (the logging happens in app code with role check)
CREATE POLICY "Authenticated users can insert audit logs"
ON public.admin_message_audit
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- Create index for faster queries
CREATE INDEX idx_admin_message_audit_sender ON public.admin_message_audit(sender_id);
CREATE INDEX idx_admin_message_audit_receiver ON public.admin_message_audit(receiver_id);
CREATE INDEX idx_admin_message_audit_created ON public.admin_message_audit(created_at DESC);