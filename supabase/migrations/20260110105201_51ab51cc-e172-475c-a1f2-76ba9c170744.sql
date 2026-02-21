-- Create admin_action_logs table for comprehensive admin action tracking
CREATE TABLE public.admin_action_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  admin_role TEXT NOT NULL,
  action_type TEXT NOT NULL,
  action_category TEXT NOT NULL,
  target_user_id UUID,
  target_content_id TEXT,
  target_content_type TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for efficient querying
CREATE INDEX idx_admin_action_logs_admin_id ON public.admin_action_logs(admin_id);
CREATE INDEX idx_admin_action_logs_action_type ON public.admin_action_logs(action_type);
CREATE INDEX idx_admin_action_logs_action_category ON public.admin_action_logs(action_category);
CREATE INDEX idx_admin_action_logs_created_at ON public.admin_action_logs(created_at DESC);
CREATE INDEX idx_admin_action_logs_target_user_id ON public.admin_action_logs(target_user_id);

-- Enable RLS
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view logs (read-only access)
CREATE POLICY "Super admins can view admin action logs"
ON public.admin_action_logs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- Admins can insert logs (when performing actions)
CREATE POLICY "Admins can create admin action logs"
ON public.admin_action_logs
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'super_admin') OR 
  public.has_role(auth.uid(), 'moderator')
);

-- No update or delete policies - logs are immutable

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_action_logs;

-- Create a function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action_type TEXT,
  p_action_category TEXT,
  p_target_user_id UUID DEFAULT NULL,
  p_target_content_id TEXT DEFAULT NULL,
  p_target_content_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin_role TEXT;
  v_log_id UUID;
BEGIN
  -- Get admin role
  SELECT role INTO v_admin_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  AND role IN ('super_admin', 'admin', 'moderator')
  ORDER BY CASE role 
    WHEN 'super_admin' THEN 1 
    WHEN 'admin' THEN 2 
    WHEN 'moderator' THEN 3 
  END
  LIMIT 1;
  
  IF v_admin_role IS NULL THEN
    RAISE EXCEPTION 'User is not an admin';
  END IF;
  
  INSERT INTO public.admin_action_logs (
    admin_id,
    admin_role,
    action_type,
    action_category,
    target_user_id,
    target_content_id,
    target_content_type,
    description,
    metadata
  ) VALUES (
    auth.uid(),
    v_admin_role,
    p_action_type,
    p_action_category,
    p_target_user_id,
    p_target_content_id,
    p_target_content_type,
    p_description,
    p_metadata
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;