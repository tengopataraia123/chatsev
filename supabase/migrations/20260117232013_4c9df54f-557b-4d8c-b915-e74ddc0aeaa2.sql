-- Create night room messages table (exact copy of group_chat_messages structure)
CREATE TABLE public.night_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  gif_id UUID REFERENCES public.gifs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES public.night_room_messages(id),
  is_private BOOLEAN NOT NULL DEFAULT false,
  private_to_user_id UUID
);

-- Create emigrants room messages table (exact copy of group_chat_messages structure)
CREATE TABLE public.emigrants_room_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  video_url TEXT,
  gif_id UUID REFERENCES public.gifs(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  reply_to_id UUID REFERENCES public.emigrants_room_messages(id),
  is_private BOOLEAN NOT NULL DEFAULT false,
  private_to_user_id UUID
);

-- Create night room presence table
CREATE TABLE public.night_room_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create emigrants room presence table
CREATE TABLE public.emigrants_room_presence (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.night_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emigrants_room_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.night_room_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emigrants_room_presence ENABLE ROW LEVEL SECURITY;

-- RLS policies for night room messages
CREATE POLICY "Anyone can view night room messages" ON public.night_room_messages
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert night room messages" ON public.night_room_messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own night room messages" ON public.night_room_messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own night room messages" ON public.night_room_messages
FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for emigrants room messages
CREATE POLICY "Anyone can view emigrants room messages" ON public.emigrants_room_messages
FOR SELECT USING (true);

CREATE POLICY "Authenticated users can insert emigrants room messages" ON public.emigrants_room_messages
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own emigrants room messages" ON public.emigrants_room_messages
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own emigrants room messages" ON public.emigrants_room_messages
FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for night room presence
CREATE POLICY "Anyone can view night room presence" ON public.night_room_presence
FOR SELECT USING (true);

CREATE POLICY "Users can manage own night room presence" ON public.night_room_presence
FOR ALL USING (auth.uid() = user_id);

-- RLS policies for emigrants room presence
CREATE POLICY "Anyone can view emigrants room presence" ON public.emigrants_room_presence
FOR SELECT USING (true);

CREATE POLICY "Users can manage own emigrants room presence" ON public.emigrants_room_presence
FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.night_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emigrants_room_messages;