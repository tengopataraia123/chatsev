-- Create game_rooms table for multiplayer Joker games
CREATE TABLE public.game_rooms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code VARCHAR(6) NOT NULL UNIQUE,
  host_id UUID NOT NULL,
  player_count INTEGER NOT NULL DEFAULT 4 CHECK (player_count IN (4, 9)),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
  game_state JSONB DEFAULT NULL,
  current_round INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create game_room_players table
CREATE TABLE public.game_room_players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES public.game_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  player_index INTEGER NOT NULL,
  is_ready BOOLEAN DEFAULT false,
  hand JSONB DEFAULT '[]',
  bid INTEGER DEFAULT NULL,
  tricks_won INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id),
  UNIQUE(room_id, player_index)
);

-- Enable Row Level Security
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_room_players ENABLE ROW LEVEL SECURITY;

-- RLS policies for game_rooms
CREATE POLICY "Anyone can view game rooms"
  ON public.game_rooms FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create rooms"
  ON public.game_rooms FOR INSERT
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update their rooms"
  ON public.game_rooms FOR UPDATE
  USING (auth.uid() = host_id OR EXISTS (
    SELECT 1 FROM public.game_room_players 
    WHERE room_id = game_rooms.id AND user_id = auth.uid()
  ));

CREATE POLICY "Host can delete their rooms"
  ON public.game_rooms FOR DELETE
  USING (auth.uid() = host_id);

-- RLS policies for game_room_players
CREATE POLICY "Anyone can view room players"
  ON public.game_room_players FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join rooms"
  ON public.game_room_players FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Players can update their own data"
  ON public.game_room_players FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = game_room_players.room_id AND host_id = auth.uid()
  ));

CREATE POLICY "Players can leave rooms"
  ON public.game_room_players FOR DELETE
  USING (auth.uid() = user_id OR EXISTS (
    SELECT 1 FROM public.game_rooms 
    WHERE id = game_room_players.room_id AND host_id = auth.uid()
  ));

-- Enable realtime for both tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.game_room_players;

-- Create trigger for updating timestamps
CREATE TRIGGER update_game_rooms_updated_at
  BEFORE UPDATE ON public.game_rooms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();