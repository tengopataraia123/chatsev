-- Create table for WebRTC signaling
CREATE TABLE public.webrtc_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  live_id UUID NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  signal_type TEXT NOT NULL CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')),
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed BOOLEAN NOT NULL DEFAULT false
);

-- Enable RLS
ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view signals meant for them
CREATE POLICY "Users can view their signals"
ON public.webrtc_signals
FOR SELECT
USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- Policy: Authenticated users can insert signals
CREATE POLICY "Users can send signals"
ON public.webrtc_signals
FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

-- Policy: Users can update their received signals (mark as processed)
CREATE POLICY "Users can update received signals"
ON public.webrtc_signals
FOR UPDATE
USING (auth.uid() = to_user_id);

-- Policy: Users can delete old signals
CREATE POLICY "Users can delete their signals"
ON public.webrtc_signals
FOR DELETE
USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);

-- Create index for faster queries
CREATE INDEX idx_webrtc_signals_live_id ON public.webrtc_signals(live_id);
CREATE INDEX idx_webrtc_signals_to_user ON public.webrtc_signals(to_user_id, processed);

-- Enable realtime for signals
ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals;