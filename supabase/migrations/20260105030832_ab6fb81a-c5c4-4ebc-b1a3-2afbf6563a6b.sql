-- Create storage bucket for media (GIFs, images, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 10485760, ARRAY['image/gif', 'image/png', 'image/jpeg', 'image/webp', 'video/mp4'])
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for media bucket
CREATE POLICY "Anyone can view media"
ON storage.objects
FOR SELECT
USING (bucket_id = 'media');

CREATE POLICY "Authenticated users can upload media"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'media' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own media"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own media"
ON storage.objects
FOR DELETE
USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);