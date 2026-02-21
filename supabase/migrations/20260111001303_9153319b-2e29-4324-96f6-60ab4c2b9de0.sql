-- Add Mux columns to videos table
ALTER TABLE public.videos 
ADD COLUMN IF NOT EXISTS mux_asset_id text,
ADD COLUMN IF NOT EXISTS mux_playback_id text,
ADD COLUMN IF NOT EXISTS mux_upload_id text,
ADD COLUMN IF NOT EXISTS processing_status text DEFAULT 'pending';

-- Add Mux columns to live_streams table
ALTER TABLE public.live_streams 
ADD COLUMN IF NOT EXISTS mux_live_id text,
ADD COLUMN IF NOT EXISTS mux_stream_key text,
ADD COLUMN IF NOT EXISTS rtmp_url text,
ADD COLUMN IF NOT EXISTS playback_id text,
ADD COLUMN IF NOT EXISTS webrtc_url text;

-- Create mux_webhooks_log table for tracking Mux events
CREATE TABLE IF NOT EXISTS public.mux_webhooks_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  mux_asset_id text,
  mux_live_id text,
  payload jsonb NOT NULL DEFAULT '{}',
  processed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on mux_webhooks_log
ALTER TABLE public.mux_webhooks_log ENABLE ROW LEVEL SECURITY;

-- Admin can view webhooks log
CREATE POLICY "Admins can view webhooks log"
ON public.mux_webhooks_log
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_videos_mux_asset_id ON public.videos(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_videos_mux_upload_id ON public.videos(mux_upload_id);
CREATE INDEX IF NOT EXISTS idx_videos_processing_status ON public.videos(processing_status);
CREATE INDEX IF NOT EXISTS idx_live_streams_mux_live_id ON public.live_streams(mux_live_id);
CREATE INDEX IF NOT EXISTS idx_mux_webhooks_event_type ON public.mux_webhooks_log(event_type);
CREATE INDEX IF NOT EXISTS idx_mux_webhooks_processed ON public.mux_webhooks_log(processed);