-- Create table for AI chat history per user
CREATE TABLE public.ai_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for fast user lookup
CREATE INDEX idx_ai_chat_messages_user_id ON public.ai_chat_messages(user_id);
CREATE INDEX idx_ai_chat_messages_created_at ON public.ai_chat_messages(user_id, created_at);

-- Enable RLS
ALTER TABLE public.ai_chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can only see their own messages
CREATE POLICY "Users can view own AI chat messages"
ON public.ai_chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own messages
CREATE POLICY "Users can insert own AI chat messages"
ON public.ai_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "Users can delete own AI chat messages"
ON public.ai_chat_messages
FOR DELETE
USING (auth.uid() = user_id);