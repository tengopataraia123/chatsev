-- Create table for tracking users specifically in the group chat room
CREATE TABLE IF NOT EXISTS public.group_chat_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_chat_presence ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view presence
CREATE POLICY "Anyone can view group chat presence"
ON public.group_chat_presence
FOR SELECT
USING (true);

-- Users can insert/update their own presence
CREATE POLICY "Users can insert their own presence"
ON public.group_chat_presence
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presence"
ON public.group_chat_presence
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presence"
ON public.group_chat_presence
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_group_chat_presence_last_active ON public.group_chat_presence(last_active_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_presence;