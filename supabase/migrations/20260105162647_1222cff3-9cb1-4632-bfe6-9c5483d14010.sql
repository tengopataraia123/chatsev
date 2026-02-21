-- Add private message column to group_chat_messages
ALTER TABLE public.group_chat_messages 
ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS private_to_user_id UUID REFERENCES public.profiles(user_id);

-- Update RLS policy to only show private messages to sender, recipient, and super_admin
DROP POLICY IF EXISTS "Anyone can view group messages" ON public.group_chat_messages;

CREATE POLICY "View group messages with private filter" 
ON public.group_chat_messages 
FOR SELECT 
USING (
  -- Non-private messages are visible to all
  (is_private = false OR is_private IS NULL)
  OR
  -- Private messages visible to sender
  (user_id = auth.uid())
  OR
  -- Private messages visible to recipient
  (private_to_user_id = auth.uid())
  OR
  -- Private messages visible to super_admin
  (EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  ))
);