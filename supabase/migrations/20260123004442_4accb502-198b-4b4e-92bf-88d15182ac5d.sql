
-- Add INSERT policy for stories bucket
CREATE POLICY "Authenticated users can upload stories"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'stories');

-- Add INSERT policy for posts bucket  
CREATE POLICY "Authenticated users can upload posts"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'posts');

-- Also add chat-videos INSERT policy (currently missing for authenticated users with simple check)
DROP POLICY IF EXISTS "Authenticated users can upload chat videos" ON storage.objects;
CREATE POLICY "Authenticated users can upload chat videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-videos');

-- Add SELECT policy for chat-videos
DROP POLICY IF EXISTS "Anyone can view chat videos" ON storage.objects;
CREATE POLICY "Anyone can view chat videos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-videos');
