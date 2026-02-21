-- Create cleanup_settings table for admin auto-cleanup configuration
CREATE TABLE IF NOT EXISTS public.cleanup_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.cleanup_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view/modify cleanup settings
CREATE POLICY "Admins can view cleanup settings" 
ON public.cleanup_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can modify cleanup settings" 
ON public.cleanup_settings 
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Insert default cleanup settings
INSERT INTO public.cleanup_settings (setting_key, setting_value, description) VALUES
  ('auto_cleanup_enabled', 'false', 'Enable automatic cleanup'),
  ('logs_retention_days', '3', 'Days to keep logs'),
  ('error_logs_retention_days', '14', 'Days to keep error logs'),
  ('temp_media_retention_hours', '48', 'Hours to keep temporary media'),
  ('inactive_sessions_days', '7', 'Days before deleting inactive sessions'),
  ('empty_rooms_hours', '24', 'Hours before deleting empty rooms'),
  ('cleanup_schedule', 'daily', 'Cleanup schedule: daily, weekly'),
  ('last_cleanup_at', '', 'Last cleanup timestamp')
ON CONFLICT (setting_key) DO NOTHING;

-- Create storage_usage_log table for tracking
CREATE TABLE IF NOT EXISTS public.storage_usage_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  total_storage_bytes BIGINT DEFAULT 0,
  images_bytes BIGINT DEFAULT 0,
  videos_bytes BIGINT DEFAULT 0,
  audio_bytes BIGINT DEFAULT 0,
  gifs_bytes BIGINT DEFAULT 0,
  logs_bytes BIGINT DEFAULT 0,
  cache_bytes BIGINT DEFAULT 0,
  active_sessions_count INTEGER DEFAULT 0,
  active_rooms_count INTEGER DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.storage_usage_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view storage logs
CREATE POLICY "Admins can view storage usage" 
ON public.storage_usage_log 
FOR SELECT 
USING (public.has_role(auth.uid(), 'admin'));

-- Only system can insert (via edge function)
CREATE POLICY "System can insert storage usage" 
ON public.storage_usage_log 
FOR INSERT 
WITH CHECK (true);

-- Create function to get cleanup stats
CREATE OR REPLACE FUNCTION public.get_cleanup_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  sessions_count integer;
  rooms_count integer;
  orphan_media_count integer;
BEGIN
  -- Check admin access
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Count active sessions (profiles with recent activity)
  SELECT COUNT(*) INTO sessions_count
  FROM profiles
  WHERE last_seen > now() - INTERVAL '24 hours';

  -- Count active rooms (dj_rooms with recent messages)
  SELECT COUNT(*) INTO rooms_count
  FROM dj_rooms
  WHERE is_active = true;

  -- Build result
  SELECT jsonb_build_object(
    'active_sessions', sessions_count,
    'active_rooms', rooms_count,
    'private_messages_total', (SELECT COUNT(*) FROM private_messages),
    'group_messages_total', (SELECT COUNT(*) FROM group_chat_messages),
    'notifications_total', (SELECT COUNT(*) FROM notifications),
    'profile_visits_total', (SELECT COUNT(*) FROM profile_visits),
    'stories_total', (SELECT COUNT(*) FROM stories),
    'gifs_total', (SELECT COUNT(*) FROM gifs),
    'posts_total', (SELECT COUNT(*) FROM posts)
  ) INTO result;

  RETURN result;
END;
$$;

-- Create function to cleanup orphaned data
CREATE OR REPLACE FUNCTION public.cleanup_orphaned_data(cleanup_type TEXT DEFAULT 'all')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer := 0;
  total_deleted integer := 0;
  result jsonb := '{}'::jsonb;
BEGIN
  -- Check admin access
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'Access denied - Super Admin only';
  END IF;

  -- Cleanup read notifications older than 30 days
  IF cleanup_type = 'all' OR cleanup_type = 'notifications' THEN
    DELETE FROM notifications 
    WHERE is_read = true AND created_at < now() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    result := result || jsonb_build_object('notifications_deleted', deleted_count);
  END IF;

  -- Cleanup old profile visits (older than 90 days)
  IF cleanup_type = 'all' OR cleanup_type = 'profile_visits' THEN
    DELETE FROM profile_visits 
    WHERE visited_at < now() - INTERVAL '90 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    result := result || jsonb_build_object('profile_visits_deleted', deleted_count);
  END IF;

  -- Cleanup expired stories (older than 24 hours and expired)
  IF cleanup_type = 'all' OR cleanup_type = 'stories' THEN
    DELETE FROM stories 
    WHERE expires_at < now() - INTERVAL '7 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    result := result || jsonb_build_object('expired_stories_deleted', deleted_count);
  END IF;

  -- Cleanup old message reads
  IF cleanup_type = 'all' OR cleanup_type = 'message_reads' THEN
    DELETE FROM group_chat_message_reads 
    WHERE seen_at < now() - INTERVAL '30 days';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    result := result || jsonb_build_object('message_reads_deleted', deleted_count);
  END IF;

  result := result || jsonb_build_object('total_deleted', total_deleted);
  
  RETURN result;
END;
$$;