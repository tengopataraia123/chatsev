-- Add storage policy for cover photo uploads
-- The cover photos are stored as covers/{user_id}/{filename}
-- So we need to check the second folder in the path

CREATE POLICY "Users can upload cover photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Also allow users to update their cover photos
CREATE POLICY "Users can update cover photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

-- Allow users to delete their cover photos
CREATE POLICY "Users can delete cover photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'chat-images' 
  AND (storage.foldername(name))[1] = 'covers'
  AND (storage.foldername(name))[2] = auth.uid()::text
);