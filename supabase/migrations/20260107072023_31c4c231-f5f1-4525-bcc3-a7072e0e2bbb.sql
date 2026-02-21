-- Create message_user_state table for per-user message visibility
CREATE TABLE public.message_user_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES public.private_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Create conversation_user_state table for per-user conversation visibility
CREATE TABLE public.conversation_user_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_cleared BOOLEAN DEFAULT false,
  cleared_at TIMESTAMP WITH TIME ZONE,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.message_user_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_user_state ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_user_state
CREATE POLICY "Users can view their own message states" 
ON public.message_user_state 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own message states" 
ON public.message_user_state 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own message states" 
ON public.message_user_state 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own message states" 
ON public.message_user_state 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS Policies for conversation_user_state
CREATE POLICY "Users can view their own conversation states" 
ON public.conversation_user_state 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own conversation states" 
ON public.conversation_user_state 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own conversation states" 
ON public.conversation_user_state 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own conversation states" 
ON public.conversation_user_state 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_message_user_state_message_id ON public.message_user_state(message_id);
CREATE INDEX idx_message_user_state_user_id ON public.message_user_state(user_id);
CREATE INDEX idx_conversation_user_state_conversation_id ON public.conversation_user_state(conversation_id);
CREATE INDEX idx_conversation_user_state_user_id ON public.conversation_user_state(user_id);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_user_state;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_user_state;