-- Create bucket for club badges
INSERT INTO storage.buckets (id, name, public)
VALUES ('fm-club-badges', 'fm-club-badges', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload their club badge
CREATE POLICY "Users can upload club badges"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'fm-club-badges' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public read access to club badges
CREATE POLICY "Club badges are publicly accessible"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'fm-club-badges');

-- Allow users to update their own club badges
CREATE POLICY "Users can update own club badges"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'fm-club-badges' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own club badges
CREATE POLICY "Users can delete own club badges"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'fm-club-badges' AND auth.uid()::text = (storage.foldername(name))[1]);