-- Create storage bucket for FM avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('fm-avatars', 'fm-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policy for public read access
CREATE POLICY "FM avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'fm-avatars');

-- Create policy for service role to upload
CREATE POLICY "Service role can upload FM avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'fm-avatars');

-- Create policy for service role to update
CREATE POLICY "Service role can update FM avatars"
ON storage.objects FOR UPDATE
USING (bucket_id = 'fm-avatars');
