-- Create profile_visits table to track who visited profiles
CREATE TABLE public.profile_visits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_user_id UUID NOT NULL,
  visitor_user_id UUID NOT NULL,
  visited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(profile_user_id, visitor_user_id)
);

-- Enable RLS
ALTER TABLE public.profile_visits ENABLE ROW LEVEL SECURITY;

-- Users can see who visited their profile
CREATE POLICY "Users can view their own profile visitors"
ON public.profile_visits
FOR SELECT
USING (auth.uid() = profile_user_id);

-- Users can insert visit records when viewing profiles
CREATE POLICY "Users can record profile visits"
ON public.profile_visits
FOR INSERT
WITH CHECK (auth.uid() = visitor_user_id);

-- Users can update their visit timestamp (for re-visits)
CREATE POLICY "Users can update their own visits"
ON public.profile_visits
FOR UPDATE
USING (auth.uid() = visitor_user_id);

-- Create index for faster queries
CREATE INDEX idx_profile_visits_profile_user_id ON public.profile_visits(profile_user_id);
CREATE INDEX idx_profile_visits_visited_at ON public.profile_visits(visited_at DESC);