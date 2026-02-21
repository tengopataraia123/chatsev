-- Create posts storage bucket for user photos
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('posts', 'posts', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to their own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow anyone to view posts images (public bucket)
CREATE POLICY "Anyone can view posts images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posts');

-- Allow users to update their own uploads
CREATE POLICY "Users can update their own posts images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own uploads
CREATE POLICY "Users can delete their own posts images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'posts' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);