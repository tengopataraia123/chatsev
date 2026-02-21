-- Add video_url column to private_messages
ALTER TABLE public.private_messages
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Add video_url column to group_chat_messages
ALTER TABLE public.group_chat_messages
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create storage bucket for chat videos (private, no moderation)
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('chat-videos', 'chat-videos', false, 524288000)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for chat-videos bucket
-- Allow authenticated users to upload their own videos
CREATE POLICY "Users can upload chat videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to view videos they have access to (conversation participants)
CREATE POLICY "Users can view their chat videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-videos');

-- Allow users to delete their own videos
CREATE POLICY "Users can delete their own chat videos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-videos' AND auth.uid()::text = (storage.foldername(name))[1]);