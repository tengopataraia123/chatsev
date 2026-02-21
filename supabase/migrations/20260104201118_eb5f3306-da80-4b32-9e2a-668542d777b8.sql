-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create user_roles table for admin management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create group_chat_messages table
CREATE TABLE public.group_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    content TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    is_deleted BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS on group_chat_messages
ALTER TABLE public.group_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS policies for group_chat_messages
CREATE POLICY "Anyone can view messages" ON public.group_chat_messages
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can send messages" ON public.group_chat_messages
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update messages" ON public.group_chat_messages
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete messages" ON public.group_chat_messages
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create user_chat_status table for mute/ban
CREATE TABLE public.user_chat_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    is_muted BOOLEAN NOT NULL DEFAULT false,
    is_banned BOOLEAN NOT NULL DEFAULT false,
    muted_until TIMESTAMP WITH TIME ZONE,
    banned_until TIMESTAMP WITH TIME ZONE,
    muted_by UUID REFERENCES auth.users(id),
    banned_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_chat_status
ALTER TABLE public.user_chat_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_chat_status
CREATE POLICY "Anyone can view chat status" ON public.user_chat_status
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage chat status" ON public.user_chat_status
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update profiles table to add last_seen for online status
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create function to update last_seen
CREATE OR REPLACE FUNCTION public.update_last_seen()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles SET last_seen = now() WHERE user_id = auth.uid();
  RETURN NEW;
END;
$$;

-- Enable realtime for group_chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_messages;

-- Create storage bucket for chat images
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', true);

-- Storage policies for chat images
CREATE POLICY "Anyone can view chat images" ON storage.objects
FOR SELECT USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload chat images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete any chat images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'chat-images' AND public.has_role(auth.uid(), 'admin'));