-- Add delete policy for super_admin on group_chat_messages
CREATE POLICY "Super admins can delete group messages" 
ON public.group_chat_messages 
FOR DELETE 
USING (has_role(auth.uid(), 'super_admin'::app_role));