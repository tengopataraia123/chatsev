
-- Table for storing FCM device tokens
CREATE TABLE public.push_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  token TEXT NOT NULL,
  platform TEXT NOT NULL DEFAULT 'android', -- 'android', 'ios', 'web'
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, token)
);

-- Enable RLS
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can view own tokens" ON public.push_tokens FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tokens" ON public.push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own tokens" ON public.push_tokens FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Users can update own tokens" ON public.push_tokens FOR UPDATE USING (auth.uid() = user_id);

-- Service role can read all tokens (for sending notifications)
-- Edge function uses service role key

-- Index for fast lookup by user_id
CREATE INDEX idx_push_tokens_user_id ON public.push_tokens(user_id);

-- Trigger for updated_at
CREATE TRIGGER update_push_tokens_updated_at
  BEFORE UPDATE ON public.push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
