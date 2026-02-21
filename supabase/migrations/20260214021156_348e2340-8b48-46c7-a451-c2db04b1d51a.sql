
-- Persistent leaderboard table: survives message deletion
CREATE TABLE public.gossip_leaderboard (
  user_id UUID NOT NULL PRIMARY KEY,
  message_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.gossip_leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leaderboard"
  ON public.gossip_leaderboard FOR SELECT USING (true);

CREATE POLICY "System manages leaderboard"
  ON public.gossip_leaderboard FOR ALL
  USING (true) WITH CHECK (true);

-- Trigger: increment count on every new group_chat_messages insert
CREATE OR REPLACE FUNCTION public.increment_gossip_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.gossip_leaderboard (user_id, message_count, updated_at)
  VALUES (NEW.user_id, 1, now())
  ON CONFLICT (user_id)
  DO UPDATE SET message_count = gossip_leaderboard.message_count + 1, updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_gossip_leaderboard_increment
  AFTER INSERT ON public.group_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_gossip_leaderboard();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.gossip_leaderboard;
