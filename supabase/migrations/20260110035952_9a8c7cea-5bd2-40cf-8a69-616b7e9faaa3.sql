-- Music playlists table
CREATE TABLE IF NOT EXISTS public.music_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  cover_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Playlist tracks (junction table)
CREATE TABLE IF NOT EXISTS public.music_playlist_tracks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID NOT NULL REFERENCES public.music_playlists(id) ON DELETE CASCADE,
  track_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, track_id)
);

-- Music likes (for "Liked Songs" functionality)
CREATE TABLE IF NOT EXISTS public.music_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  track_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, track_id)
);

-- Add new columns to music table if they don't exist
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS album TEXT;
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS genre TEXT;
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS lyrics TEXT;
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS privacy TEXT DEFAULT 'public';
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'approved';
ALTER TABLE public.music ADD COLUMN IF NOT EXISTS file_size INTEGER;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_playlists_user ON public.music_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist ON public.music_playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_music_likes_user ON public.music_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_music_likes_track ON public.music_likes(track_id);

-- Enable RLS
ALTER TABLE public.music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_likes ENABLE ROW LEVEL SECURITY;

-- Playlists policies
CREATE POLICY "Users can view public playlists or their own"
  ON public.music_playlists FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create their own playlists"
  ON public.music_playlists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own playlists"
  ON public.music_playlists FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own playlists"
  ON public.music_playlists FOR DELETE
  USING (auth.uid() = user_id);

-- Playlist tracks policies
CREATE POLICY "Users can view tracks from accessible playlists"
  ON public.music_playlist_tracks FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.music_playlists p 
    WHERE p.id = playlist_id AND (p.is_public = true OR p.user_id = auth.uid())
  ));

CREATE POLICY "Users can add tracks to their playlists"
  ON public.music_playlist_tracks FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.music_playlists p 
    WHERE p.id = playlist_id AND p.user_id = auth.uid()
  ));

CREATE POLICY "Users can remove tracks from their playlists"
  ON public.music_playlist_tracks FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.music_playlists p 
    WHERE p.id = playlist_id AND p.user_id = auth.uid()
  ));

-- Music likes policies
CREATE POLICY "Users can view their own likes"
  ON public.music_likes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can like tracks"
  ON public.music_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike tracks"
  ON public.music_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Create music storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('music', 'music', true, 104857600)
ON CONFLICT (id) DO UPDATE SET file_size_limit = 104857600;

-- Storage policies for music
CREATE POLICY "Anyone can view music files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'music');

CREATE POLICY "Authenticated users can upload music"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'music' AND auth.role() = 'authenticated');

CREATE POLICY "Users can update their own music files"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own music files"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'music' AND auth.uid()::text = (storage.foldername(name))[1]);