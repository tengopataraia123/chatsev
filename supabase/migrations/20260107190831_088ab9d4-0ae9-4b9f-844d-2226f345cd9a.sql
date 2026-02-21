
-- Create table for tracking group chat message reads (seen functionality)
CREATE TABLE public.group_chat_message_reads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.group_chat_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  seen_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_chat_message_reads ENABLE ROW LEVEL SECURITY;

-- Create index for faster queries
CREATE INDEX idx_group_chat_message_reads_message_id ON public.group_chat_message_reads(message_id);
CREATE INDEX idx_group_chat_message_reads_user_id ON public.group_chat_message_reads(user_id);

-- RLS Policies
-- Anyone authenticated can view reads
CREATE POLICY "Users can view message reads"
ON public.group_chat_message_reads
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own read records
CREATE POLICY "Users can mark messages as seen"
ON public.group_chat_message_reads
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_message_reads;
