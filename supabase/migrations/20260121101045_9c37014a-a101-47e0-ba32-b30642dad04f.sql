-- Create table to track when users cleared their chat view for each room
CREATE TABLE IF NOT EXISTS public.group_chat_user_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('gossip', 'night', 'emigrants', 'dj')),
  cleared_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, room_type)
);

-- Enable RLS
ALTER TABLE public.group_chat_user_state ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own chat state"
ON public.group_chat_user_state FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own chat state"
ON public.group_chat_user_state FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own chat state"
ON public.group_chat_user_state FOR UPDATE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_group_chat_user_state_updated_at
BEFORE UPDATE ON public.group_chat_user_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_user_state;