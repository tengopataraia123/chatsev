-- Live Streams Table (Main live room)
CREATE TABLE public.live_streams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'prelive' CHECK (status IN ('prelive', 'live', 'paused', 'ended')),
  stream_type TEXT NOT NULL DEFAULT 'single' CHECK (stream_type IN ('single', 'multi')),
  min_participants INTEGER NOT NULL DEFAULT 4,
  viewer_count INTEGER NOT NULL DEFAULT 0,
  like_count INTEGER NOT NULL DEFAULT 0,
  reaction_count INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  slow_mode_seconds INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Live Participants (Hosts/Guests in multi-person live)
CREATE TABLE public.live_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'guest' CHECK (role IN ('host', 'guest')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('invited', 'requested', 'approved', 'rejected', 'ignored', 'connected', 'disconnected', 'left')),
  is_muted BOOLEAN NOT NULL DEFAULT false,
  is_camera_off BOOLEAN NOT NULL DEFAULT false,
  position INTEGER NOT NULL DEFAULT 0,
  invited_at TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE,
  left_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(live_id, user_id)
);

-- Live Viewers (People watching)
CREATE TABLE public.live_viewers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  is_blocked BOOLEAN NOT NULL DEFAULT false,
  is_muted_chat BOOLEAN NOT NULL DEFAULT false,
  muted_until TIMESTAMP WITH TIME ZONE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  left_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(live_id, user_id)
);

-- Live Comments
CREATE TABLE public.live_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Live Reactions
CREATE TABLE public.live_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  reaction_type TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Live Invites (for tracking invite/request cooldowns)
CREATE TABLE public.live_invites (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  invite_type TEXT NOT NULL DEFAULT 'invite' CHECK (invite_type IN ('invite', 'request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired', 'ignored')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '60 seconds'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  responded_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all tables
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_viewers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_invites ENABLE ROW LEVEL SECURITY;

-- Live Streams Policies
CREATE POLICY "Anyone can view active live streams"
ON public.live_streams FOR SELECT
USING (status IN ('prelive', 'live') OR host_id = auth.uid());

CREATE POLICY "Users can create their own live streams"
ON public.live_streams FOR INSERT
WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their own live streams"
ON public.live_streams FOR UPDATE
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Hosts can delete their own live streams"
ON public.live_streams FOR DELETE
USING (auth.uid() = host_id OR public.has_role(auth.uid(), 'super_admin'));

-- Live Participants Policies
CREATE POLICY "Anyone can view live participants"
ON public.live_participants FOR SELECT
USING (true);

CREATE POLICY "Users can join as participants"
ON public.live_participants FOR INSERT
WITH CHECK (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.live_streams WHERE id = live_id AND host_id = auth.uid()
));

CREATE POLICY "Participants and hosts can update status"
ON public.live_participants FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.live_streams WHERE id = live_id AND host_id = auth.uid()
));

CREATE POLICY "Hosts can remove participants"
ON public.live_participants FOR DELETE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.live_streams WHERE id = live_id AND host_id = auth.uid()
));

-- Live Viewers Policies
CREATE POLICY "Anyone can view viewers list"
ON public.live_viewers FOR SELECT
USING (true);

CREATE POLICY "Users can join as viewers"
ON public.live_viewers FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Hosts and self can update viewer status"
ON public.live_viewers FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.live_streams WHERE id = live_id AND host_id = auth.uid()
));

CREATE POLICY "Users can leave"
ON public.live_viewers FOR DELETE
USING (auth.uid() = user_id);

-- Live Comments Policies
CREATE POLICY "Anyone can view comments"
ON public.live_comments FOR SELECT
USING (is_deleted = false);

CREATE POLICY "Users can post comments"
ON public.live_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users and hosts can update comments"
ON public.live_comments FOR UPDATE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.live_streams WHERE id = live_id AND host_id = auth.uid()
) OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "Hosts and mods can delete comments"
ON public.live_comments FOR DELETE
USING (auth.uid() = user_id OR EXISTS (
  SELECT 1 FROM public.live_streams WHERE id = live_id AND host_id = auth.uid()
) OR public.has_role(auth.uid(), 'moderator'));

-- Live Reactions Policies
CREATE POLICY "Anyone can view reactions"
ON public.live_reactions FOR SELECT
USING (true);

CREATE POLICY "Users can add reactions"
ON public.live_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Live Invites Policies
CREATE POLICY "Users can view their invites"
ON public.live_invites FOR SELECT
USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can create invites"
ON public.live_invites FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can respond to invites"
ON public.live_invites FOR UPDATE
USING (to_user_id = auth.uid() OR from_user_id = auth.uid());

-- Enable realtime for live tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_viewers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_invites;

-- Create indexes for better performance
CREATE INDEX idx_live_streams_status ON public.live_streams(status);
CREATE INDEX idx_live_streams_host ON public.live_streams(host_id);
CREATE INDEX idx_live_participants_live ON public.live_participants(live_id);
CREATE INDEX idx_live_participants_user ON public.live_participants(user_id);
CREATE INDEX idx_live_viewers_live ON public.live_viewers(live_id);
CREATE INDEX idx_live_comments_live ON public.live_comments(live_id);
CREATE INDEX idx_live_reactions_live ON public.live_reactions(live_id);

-- Function to update viewer count
CREATE OR REPLACE FUNCTION public.update_live_viewer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.live_streams 
    SET viewer_count = viewer_count + 1, updated_at = now()
    WHERE id = NEW.live_id;
  ELSIF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.left_at IS NOT NULL AND OLD.left_at IS NULL) THEN
    UPDATE public.live_streams 
    SET viewer_count = GREATEST(0, viewer_count - 1), updated_at = now()
    WHERE id = COALESCE(NEW.live_id, OLD.live_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_live_viewer_count
AFTER INSERT OR UPDATE OR DELETE ON public.live_viewers
FOR EACH ROW EXECUTE FUNCTION public.update_live_viewer_count();

-- Function to update reaction count
CREATE OR REPLACE FUNCTION public.update_live_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.live_streams 
  SET reaction_count = reaction_count + 1, updated_at = now()
  WHERE id = NEW.live_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_update_live_reaction_count
AFTER INSERT ON public.live_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_live_reaction_count();