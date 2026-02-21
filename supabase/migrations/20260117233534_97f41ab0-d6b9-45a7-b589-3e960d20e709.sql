-- Create DJ room messages table
CREATE TABLE public.dj_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  gif_id UUID REFERENCES public.gifs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES public.dj_room_messages(id),
  is_private BOOLEAN NOT NULL DEFAULT false,
  private_to_user_id UUID
);

-- Create DJ room presence table
CREATE TABLE public.dj_room_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DJ room playlist table
CREATE TABLE public.dj_room_playlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT,
  url TEXT,
  added_by UUID NOT NULL,
  is_playing BOOLEAN NOT NULL DEFAULT false,
  is_played BOOLEAN NOT NULL DEFAULT false,
  play_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create DJ room song requests table
CREATE TABLE public.dj_room_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  song_title TEXT NOT NULL,
  artist TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dj_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_room_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_room_playlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dj_room_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies for dj room messages
CREATE POLICY "Anyone can view dj room messages" ON public.dj_room_messages
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert dj room messages" ON public.dj_room_messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dj room messages" ON public.dj_room_messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dj room messages" ON public.dj_room_messages
FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for dj room presence
CREATE POLICY "Anyone can view dj room presence" ON public.dj_room_presence
FOR SELECT USING (true);

CREATE POLICY "Users can manage own dj room presence" ON public.dj_room_presence
FOR ALL USING (auth.uid() = user_id);

-- RLS policies for playlist (only super admins can insert/update/delete)
CREATE POLICY "Anyone can view playlist" ON public.dj_room_playlist
FOR SELECT USING (true);

CREATE POLICY "Super admins can manage playlist" ON public.dj_room_playlist
FOR ALL USING (public.has_role(auth.uid(), 'super_admin'));

-- RLS policies for requests
CREATE POLICY "Anyone can view requests" ON public.dj_room_requests
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert requests" ON public.dj_room_requests
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update requests" ON public.dj_room_requests
FOR UPDATE USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dj_room_playlist;