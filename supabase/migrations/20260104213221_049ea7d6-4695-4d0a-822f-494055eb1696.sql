-- Add storage bucket for stories with video support
INSERT INTO storage.buckets (id, name, public) 
VALUES ('stories', 'stories', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for stories bucket
CREATE POLICY "Anyone can view stories" ON storage.objects FOR SELECT USING (bucket_id = 'stories');
CREATE POLICY "Authenticated users can upload stories" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'stories' AND auth.uid() IS NOT NULL);
CREATE POLICY "Users can delete their own stories" ON storage.objects FOR DELETE USING (bucket_id = 'stories' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add video_url, music_url, music_title columns to stories table
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS video_url text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS music_url text;
ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS music_title text;

-- Create user_blocks table for user-to-user blocking
CREATE TABLE IF NOT EXISTS public.user_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocks" ON public.user_blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);
CREATE POLICY "Users can block others" ON public.user_blocks FOR INSERT WITH CHECK (auth.uid() = blocker_id);
CREATE POLICY "Users can unblock" ON public.user_blocks FOR DELETE USING (auth.uid() = blocker_id);

-- Create friendships table for friend-based messaging
CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  addressee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships" ON public.friendships FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
CREATE POLICY "Users can send friend requests" ON public.friendships FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Users can update friendship status" ON public.friendships FOR UPDATE USING (auth.uid() = addressee_id OR auth.uid() = requester_id);
CREATE POLICY "Users can delete friendships" ON public.friendships FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Create site-wide bans table (different from chat bans)
CREATE TABLE IF NOT EXISTS public.site_bans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  banned_by uuid NOT NULL,
  reason text,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  banned_until timestamp with time zone
);

ALTER TABLE public.site_bans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check if user is banned" ON public.site_bans FOR SELECT USING (true);
CREATE POLICY "Admins can ban users" ON public.site_bans FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can unban users" ON public.site_bans FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Create trending_music table for story music
CREATE TABLE IF NOT EXISTS public.trending_music (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  artist text,
  audio_url text NOT NULL,
  cover_url text,
  plays integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  is_active boolean DEFAULT true
);

ALTER TABLE public.trending_music ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view trending music" ON public.trending_music FOR SELECT USING (true);
CREATE POLICY "Admins can manage music" ON public.trending_music FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add is_site_banned column to profiles for quick lookup
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_site_banned boolean DEFAULT false;

-- Update stories deletion policy to allow admins to delete any story
DROP POLICY IF EXISTS "Users can delete their stories" ON public.stories;
CREATE POLICY "Users can delete their stories" ON public.stories FOR DELETE 
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Update posts deletion policy to allow admins to delete any post
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;
CREATE POLICY "Users can delete their own posts" ON public.posts FOR DELETE 
  USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

-- Enable realtime for friendships and blocks
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_blocks;