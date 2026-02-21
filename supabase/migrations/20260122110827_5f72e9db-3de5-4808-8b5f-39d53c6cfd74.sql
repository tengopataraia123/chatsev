-- Game Friends table for managing game-specific friendships
CREATE TABLE public.game_friends (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'declined', 'canceled', 'removed', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(requester_id, recipient_id)
);

-- Game Invites table for inviting Game Friends to game rooms
CREATE TABLE public.game_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL,
  game_type TEXT NOT NULL,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'canceled')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '10 minutes')
);

-- Indexes for game_friends
CREATE INDEX idx_game_friends_requester ON public.game_friends(requester_id);
CREATE INDEX idx_game_friends_recipient ON public.game_friends(recipient_id);
CREATE INDEX idx_game_friends_status ON public.game_friends(status);
CREATE INDEX idx_game_friends_recipient_status ON public.game_friends(recipient_id, status);

-- Indexes for game_invites
CREATE INDEX idx_game_invites_room ON public.game_invites(room_id);
CREATE INDEX idx_game_invites_to_user ON public.game_invites(to_user_id);
CREATE INDEX idx_game_invites_from_user ON public.game_invites(from_user_id);
CREATE INDEX idx_game_invites_status ON public.game_invites(status);

-- Enable RLS
ALTER TABLE public.game_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_invites ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_friends
CREATE POLICY "Users can view their own game friendships"
ON public.game_friends FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send game friend requests"
ON public.game_friends FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their own game friendships"
ON public.game_friends FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own game friendships"
ON public.game_friends FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- RLS Policies for game_invites
CREATE POLICY "Users can view invites they sent or received"
ON public.game_invites FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send game invites"
ON public.game_invites FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update invites they're involved in"
ON public.game_invites FOR UPDATE
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can delete invites they sent"
ON public.game_invites FOR DELETE
USING (auth.uid() = from_user_id);

-- Trigger for updating updated_at
CREATE TRIGGER update_game_friends_updated_at
BEFORE UPDATE ON public.game_friends
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_game_invites_updated_at
BEFORE UPDATE ON public.game_invites
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for game_invites
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_friends;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_invites;