
-- Create calls table for tracking video/audio calls
CREATE TABLE public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  call_type TEXT NOT NULL CHECK (call_type IN ('audio', 'video')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ringing', 'active', 'ended', 'missed', 'declined', 'busy')),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  end_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create call signals table for WebRTC signaling
CREATE TABLE public.call_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  from_user_id UUID NOT NULL,
  to_user_id UUID NOT NULL,
  signal_type TEXT NOT NULL,
  signal_data JSONB,
  processed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_signals ENABLE ROW LEVEL SECURITY;

-- RLS policies for calls
CREATE POLICY "Users can view their own calls"
ON public.calls FOR SELECT
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create calls"
ON public.calls FOR INSERT
WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Users can update their own calls"
ON public.calls FOR UPDATE
USING (auth.uid() = caller_id OR auth.uid() = receiver_id);

-- RLS policies for call_signals
CREATE POLICY "Users can view their call signals"
ON public.call_signals FOR SELECT
USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can create call signals"
ON public.call_signals FOR INSERT
WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update call signals"
ON public.call_signals FOR UPDATE
USING (auth.uid() = to_user_id);

-- Indexes for better performance
CREATE INDEX idx_calls_caller ON public.calls(caller_id);
CREATE INDEX idx_calls_receiver ON public.calls(receiver_id);
CREATE INDEX idx_calls_status ON public.calls(status);
CREATE INDEX idx_call_signals_call ON public.call_signals(call_id);
CREATE INDEX idx_call_signals_to_user ON public.call_signals(to_user_id, processed);

-- Enable realtime for call signals (for WebRTC signaling)
ALTER PUBLICATION supabase_realtime ADD TABLE public.call_signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.calls;
