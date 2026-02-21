-- Create durak_chat_messages table for private in-game chat
CREATE TABLE IF NOT EXISTS public.durak_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_durak_chat_room_id ON public.durak_chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_durak_chat_created_at ON public.durak_chat_messages(created_at DESC);

-- Enable RLS
ALTER TABLE public.durak_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Only players in the room OR super_admins can view/send messages
CREATE POLICY "Durak chat: Players can view room messages"
ON public.durak_chat_messages
FOR SELECT
USING (
  -- User is a player in the room
  EXISTS (
    SELECT 1 FROM public.game_room_players grp
    WHERE grp.room_id = durak_chat_messages.room_id
    AND grp.user_id = auth.uid()
  )
  OR
  -- User is super_admin
  public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Durak chat: Players can send messages"
ON public.durak_chat_messages
FOR INSERT
WITH CHECK (
  -- Sender must be authenticated and match sender_id
  auth.uid() = sender_id
  AND
  -- Sender must be a player in the room
  EXISTS (
    SELECT 1 FROM public.game_room_players grp
    WHERE grp.room_id = durak_chat_messages.room_id
    AND grp.user_id = auth.uid()
  )
);

CREATE POLICY "Durak chat: Players can delete own messages"
ON public.durak_chat_messages
FOR DELETE
USING (
  auth.uid() = sender_id
  OR
  public.has_role(auth.uid(), 'super_admin')
);

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.durak_chat_messages;