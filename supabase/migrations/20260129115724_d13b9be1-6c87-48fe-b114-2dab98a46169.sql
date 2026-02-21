-- Drop and recreate the admin policy to include moderators
DROP POLICY IF EXISTS "Admins can manage chat status" ON public.user_chat_status;

CREATE POLICY "Staff can manage chat status"
ON public.user_chat_status
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'moderator'::app_role)
);

-- Also create a trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_user_chat_status_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS update_user_chat_status_updated_at ON public.user_chat_status;
CREATE TRIGGER update_user_chat_status_updated_at
  BEFORE UPDATE ON public.user_chat_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_chat_status_updated_at();