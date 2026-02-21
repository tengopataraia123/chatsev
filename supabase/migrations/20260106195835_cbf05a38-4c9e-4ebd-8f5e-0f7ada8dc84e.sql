
-- Create system_broadcasts table
CREATE TABLE public.system_broadcasts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_by UUID NOT NULL,
  title TEXT,
  message TEXT NOT NULL,
  link_url TEXT,
  target_type TEXT NOT NULL DEFAULT 'all',
  target_roles JSONB,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_target_type CHECK (target_type IN ('all', 'girls', 'boys', 'admins', 'custom_roles')),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'canceled'))
);

-- Create system_broadcast_recipients table
CREATE TABLE public.system_broadcast_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id UUID NOT NULL REFERENCES public.system_broadcasts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'queued',
  delivered_at TIMESTAMP WITH TIME ZONE,
  seen_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_delivery_status CHECK (delivery_status IN ('queued', 'sent', 'failed', 'seen'))
);

-- Create indexes
CREATE INDEX idx_system_broadcasts_status ON public.system_broadcasts(status);
CREATE INDEX idx_system_broadcasts_created_by ON public.system_broadcasts(created_by);
CREATE INDEX idx_system_broadcast_recipients_user ON public.system_broadcast_recipients(user_id);
CREATE INDEX idx_system_broadcast_recipients_broadcast ON public.system_broadcast_recipients(broadcast_id);
CREATE INDEX idx_system_broadcast_recipients_status ON public.system_broadcast_recipients(delivery_status);

-- Enable RLS
ALTER TABLE public.system_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_broadcast_recipients ENABLE ROW LEVEL SECURITY;

-- Policies for system_broadcasts (Super Admin only)
CREATE POLICY "Super admins can manage broadcasts"
  ON public.system_broadcasts
  FOR ALL
  USING (has_role('super_admin'::app_role, auth.uid()))
  WITH CHECK (has_role('super_admin'::app_role, auth.uid()));

-- Policies for system_broadcast_recipients
CREATE POLICY "Super admins can manage recipients"
  ON public.system_broadcast_recipients
  FOR ALL
  USING (has_role('super_admin'::app_role, auth.uid()))
  WITH CHECK (has_role('super_admin'::app_role, auth.uid()));

CREATE POLICY "Users can view their own broadcast messages"
  ON public.system_broadcast_recipients
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own seen status"
  ON public.system_broadcast_recipients
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_system_broadcasts_updated_at
  BEFORE UPDATE ON public.system_broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
