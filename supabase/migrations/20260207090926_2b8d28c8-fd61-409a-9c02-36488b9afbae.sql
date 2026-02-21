-- Revert system_broadcast_recipients policies to super_admin only
DROP POLICY IF EXISTS "Admins can insert recipients" ON public.system_broadcast_recipients;
DROP POLICY IF EXISTS "Admins can view all recipients" ON public.system_broadcast_recipients;
DROP POLICY IF EXISTS "Admins can update recipients" ON public.system_broadcast_recipients;
DROP POLICY IF EXISTS "Admins can delete recipients" ON public.system_broadcast_recipients;
DROP POLICY IF EXISTS "Users can update their own seen status" ON public.system_broadcast_recipients;
DROP POLICY IF EXISTS "Users can view their own broadcast messages" ON public.system_broadcast_recipients;

-- Super admins only can INSERT recipients
CREATE POLICY "Super admins can insert recipients"
ON public.system_broadcast_recipients
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Super admins can view all, users can view their own
CREATE POLICY "View recipients policy"
ON public.system_broadcast_recipients
FOR SELECT
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  auth.uid() = user_id
);

-- Super admins can update all, users can update their own seen status
CREATE POLICY "Update recipients policy"
ON public.system_broadcast_recipients
FOR UPDATE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR
  auth.uid() = user_id
);

-- Only super admins can delete
CREATE POLICY "Super admins can delete recipients"
ON public.system_broadcast_recipients
FOR DELETE
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Revert system_broadcasts policies to super_admin only
DROP POLICY IF EXISTS "Admins can manage broadcasts" ON public.system_broadcasts;
DROP POLICY IF EXISTS "Users can view broadcasts they received" ON public.system_broadcasts;

-- Only super admins can manage broadcasts
CREATE POLICY "Super admins can manage broadcasts"
ON public.system_broadcasts
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can view broadcasts they received
CREATE POLICY "Users can view their broadcasts"
ON public.system_broadcasts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM system_broadcast_recipients
    WHERE broadcast_id = system_broadcasts.id
    AND user_id = auth.uid()
  )
);