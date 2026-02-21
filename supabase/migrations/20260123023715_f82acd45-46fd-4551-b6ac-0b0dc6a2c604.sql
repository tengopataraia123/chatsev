-- Fix storage RLS policy for chat-images to allow uploads in subfolders
DROP POLICY IF EXISTS "Authenticated users can upload chat images" ON storage.objects;

CREATE POLICY "Authenticated users can upload chat images" 
ON storage.objects 
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);

-- Ensure users can delete their own images from chat-images
DROP POLICY IF EXISTS "Users can delete own chat images" ON storage.objects;

CREATE POLICY "Users can delete own chat images" 
ON storage.objects 
FOR DELETE
TO authenticated
USING (bucket_id = 'chat-images' AND auth.uid() IS NOT NULL);