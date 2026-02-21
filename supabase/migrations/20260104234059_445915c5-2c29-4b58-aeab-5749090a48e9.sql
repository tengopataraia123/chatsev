-- Create message_reactions table for all message types
CREATE TABLE public.message_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('group_chat', 'private', 'comment', 'reply')),
  message_id UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'love', 'haha', 'wow', 'sad', 'angry', 'care')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, message_type, message_id)
);

-- Enable RLS
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view reactions"
ON public.message_reactions
FOR SELECT
USING (true);

CREATE POLICY "Users can add reactions"
ON public.message_reactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their reactions"
ON public.message_reactions
FOR DELETE
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their reactions"
ON public.message_reactions
FOR UPDATE
USING (auth.uid() = user_id);

-- Enable realtime for message_reactions
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;