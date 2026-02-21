-- Drop the existing restrictive update policy
DROP POLICY IF EXISTS "Users can update own messages" ON public.messenger_messages;

-- Create a more flexible update policy that allows:
-- 1. Senders to update their own messages (edit, delete)
-- 2. Recipients to mark messages as read (update read_at)
CREATE POLICY "Users can update messages in their conversations"
ON public.messenger_messages
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM messenger_conversations c
    WHERE c.id = messenger_messages.conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM messenger_conversations c
    WHERE c.id = messenger_messages.conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

-- Also fix the delete policy to allow deleting messages in user's conversations
DROP POLICY IF EXISTS "Users can delete own messages" ON public.messenger_messages;

CREATE POLICY "Users can delete messages in their conversations"
ON public.messenger_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM messenger_conversations c
    WHERE c.id = messenger_messages.conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);