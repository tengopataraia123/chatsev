
-- Update posts bucket to allow larger files and video
UPDATE storage.buckets 
SET file_size_limit = 104857600, -- 100MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
WHERE id = 'posts';

-- Update media bucket to allow larger files
UPDATE storage.buckets 
SET file_size_limit = 104857600 -- 100MB
WHERE id = 'media';

-- Make sure chat-videos is public
UPDATE storage.buckets 
SET public = true
WHERE id = 'chat-videos';

-- Update stories bucket allowed types
UPDATE storage.buckets 
SET allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/webm']
WHERE id = 'stories';

-- Drop and recreate RLS policies for stories bucket
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view stories" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own stories" ON storage.objects;

-- Allow authenticated users to upload to stories bucket
CREATE POLICY "Users can upload to stories"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stories');

-- Allow public read access to stories
CREATE POLICY "Public can view stories"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'stories');

-- Allow users to delete their own stories
CREATE POLICY "Users can delete from stories"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'stories');

-- RLS policies for posts bucket
DROP POLICY IF EXISTS "Users can upload posts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view posts" ON storage.objects;

CREATE POLICY "Users can upload to posts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

CREATE POLICY "Public can view posts"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'posts');

-- RLS policies for media bucket
DROP POLICY IF EXISTS "Users can upload media" ON storage.objects;
DROP POLICY IF EXISTS "Public can view media" ON storage.objects;

CREATE POLICY "Users can upload to media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Public can view media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'media');
