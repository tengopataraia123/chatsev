-- Drop the existing player_count check constraint
ALTER TABLE public.game_rooms DROP CONSTRAINT IF EXISTS game_rooms_player_count_check;

-- Add new constraint allowing 2-9 players
ALTER TABLE public.game_rooms ADD CONSTRAINT game_rooms_player_count_check CHECK (player_count >= 2 AND player_count <= 9);