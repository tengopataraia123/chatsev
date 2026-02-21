-- Update bucket file size limits for cost optimization

-- Stories: 50MB limit (was 100MB)
UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB
WHERE id = 'stories';

-- Chat images: 5MB limit
UPDATE storage.buckets 
SET file_size_limit = 5242880  -- 5MB
WHERE id = 'chat-images';

-- Chat videos: 25MB limit (was unlimited)
UPDATE storage.buckets 
SET file_size_limit = 26214400  -- 25MB
WHERE id = 'chat-videos';

-- Media bucket: 10MB limit
UPDATE storage.buckets 
SET file_size_limit = 10485760  -- 10MB
WHERE id = 'media';

-- Posts bucket: 50MB limit
UPDATE storage.buckets 
SET file_size_limit = 52428800  -- 50MB
WHERE id = 'posts';

-- Videos bucket: 100MB limit
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB
WHERE id = 'videos';

-- Reels bucket: 100MB limit
UPDATE storage.buckets 
SET file_size_limit = 104857600  -- 100MB
WHERE id = 'reels';

-- Music/audio bucket: 10MB limit
UPDATE storage.buckets 
SET file_size_limit = 10485760  -- 10MB
WHERE id = 'music';

-- GIFs bucket: 5MB limit
UPDATE storage.buckets 
SET file_size_limit = 5242880  -- 5MB
WHERE id = 'gifs';

-- Create cleanup settings table if not exists
CREATE TABLE IF NOT EXISTS public.cleanup_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Insert default cleanup settings
INSERT INTO public.cleanup_settings (setting_key, setting_value, description) VALUES
  ('story_retention_hours', '24', 'How long to keep stories before auto-deletion'),
  ('deleted_message_retention_days', '30', 'How long to keep deleted message attachments'),
  ('max_storage_warning_gb', '50', 'Warn admin when storage exceeds this amount'),
  ('auto_cleanup_enabled', 'true', 'Whether automatic cleanup is enabled'),
  ('last_cleanup_run', '', 'Timestamp of last cleanup run')
ON CONFLICT (setting_key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.cleanup_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/edit cleanup settings
CREATE POLICY "Admins can manage cleanup settings"
  ON public.cleanup_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('super_admin', 'admin')
    )
  );

-- Create storage usage tracking view for admins
CREATE OR REPLACE VIEW public.storage_usage_stats AS
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  DATE(created_at) as upload_date
FROM storage.objects
GROUP BY bucket_id, DATE(created_at)
ORDER BY upload_date DESC, file_count DESC;