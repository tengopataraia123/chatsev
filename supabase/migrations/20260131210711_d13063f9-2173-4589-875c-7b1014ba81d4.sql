-- Typing status table for real-time typing indicators
CREATE TABLE IF NOT EXISTS public.typing_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

-- Enable RLS
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;

-- Policies for typing status
CREATE POLICY "Users can view typing status in their conversations"
ON public.typing_status FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c
    WHERE c.id = conversation_id
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own typing status"
ON public.typing_status FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Add seen_at column to private_messages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'private_messages' AND column_name = 'seen_at'
  ) THEN
    ALTER TABLE public.private_messages ADD COLUMN seen_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add delivered_at column to private_messages if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'private_messages' AND column_name = 'delivered_at'
  ) THEN
    ALTER TABLE public.private_messages ADD COLUMN delivered_at TIMESTAMPTZ;
  END IF;
END $$;

-- Enable realtime for typing status
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;