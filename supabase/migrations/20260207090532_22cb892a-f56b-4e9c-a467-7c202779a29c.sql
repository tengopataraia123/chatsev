-- Fix system_broadcast_recipients INSERT policy to allow admins (not just super_admins)
DROP POLICY IF EXISTS "Super admins can manage recipients" ON public.system_broadcast_recipients;

-- Allow admins to INSERT recipients (for sending broadcasts)
CREATE POLICY "Admins can insert recipients"
ON public.system_broadcast_recipients
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Allow admins to SELECT recipients (for viewing stats)
CREATE POLICY "Admins can view all recipients"
ON public.system_broadcast_recipients
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  auth.uid() = user_id
);

-- Allow admins to UPDATE recipients
CREATE POLICY "Admins can update recipients"
ON public.system_broadcast_recipients
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role) OR
  auth.uid() = user_id
);

-- Allow admins to DELETE recipients
CREATE POLICY "Admins can delete recipients"
ON public.system_broadcast_recipients
FOR DELETE
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);

-- Also fix system_broadcasts policy
DROP POLICY IF EXISTS "Super admins can manage broadcasts" ON public.system_broadcasts;

CREATE POLICY "Admins can manage broadcasts"
ON public.system_broadcasts
FOR ALL
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'super_admin'::app_role)
);