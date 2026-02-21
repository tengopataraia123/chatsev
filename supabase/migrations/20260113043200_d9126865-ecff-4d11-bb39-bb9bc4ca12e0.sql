-- Create table to store dismissed friend suggestions
CREATE TABLE public.dismissed_friend_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  dismissed_user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, dismissed_user_id)
);

-- Enable RLS
ALTER TABLE public.dismissed_friend_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own dismissed suggestions"
ON public.dismissed_friend_suggestions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can dismiss suggestions"
ON public.dismissed_friend_suggestions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove dismissed suggestions"
ON public.dismissed_friend_suggestions
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_dismissed_friend_suggestions_user_id ON public.dismissed_friend_suggestions(user_id);