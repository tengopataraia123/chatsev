-- Add edited_at column to private_messages for tracking edits
ALTER TABLE public.private_messages 
ADD COLUMN IF NOT EXISTS edited_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add policy for users to update their own messages
CREATE POLICY "Users can update their own messages" 
ON public.private_messages 
FOR UPDATE 
USING (auth.uid() = sender_id);