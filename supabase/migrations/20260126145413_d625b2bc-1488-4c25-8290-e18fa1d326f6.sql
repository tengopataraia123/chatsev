-- Create storage bucket for movie posters
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'movie-posters', 
  'movie-posters', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone to view movie posters (public bucket)
CREATE POLICY "Movie posters are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'movie-posters');

-- Only super admins can upload movie posters
CREATE POLICY "Super admins can upload movie posters"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'movie-posters' 
  AND public.is_super_admin(auth.uid())
);

-- Only super admins can update movie posters
CREATE POLICY "Super admins can update movie posters"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'movie-posters' 
  AND public.is_super_admin(auth.uid())
);

-- Only super admins can delete movie posters
CREATE POLICY "Super admins can delete movie posters"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'movie-posters' 
  AND public.is_super_admin(auth.uid())
);