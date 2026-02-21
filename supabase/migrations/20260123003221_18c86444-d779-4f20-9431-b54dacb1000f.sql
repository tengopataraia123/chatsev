-- Drop and recreate the upload policy for stories bucket with correct check
DROP POLICY IF EXISTS "Authenticated users can upload stories" ON storage.objects;

CREATE POLICY "Authenticated users can upload stories"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'stories' AND auth.role() = 'authenticated');

-- Also update file size limit for stories bucket
UPDATE storage.buckets 
SET file_size_limit = 104857600 
WHERE id = 'stories';