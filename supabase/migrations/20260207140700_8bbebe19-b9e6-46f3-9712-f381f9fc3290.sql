-- Create game chat messages table
CREATE TABLE public.game_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_id UUID NOT NULL,
  game_type TEXT NOT NULL CHECK (game_type IN ('durak', 'joker', 'domino', 'nardi', 'bura')),
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_game_chat_messages_game_id ON public.game_chat_messages(game_id);
CREATE INDEX idx_game_chat_messages_created_at ON public.game_chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.game_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies - anyone authenticated can read game messages
CREATE POLICY "Users can view game chat messages"
ON public.game_chat_messages
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own messages
CREATE POLICY "Users can send game chat messages"
ON public.game_chat_messages
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_chat_messages;