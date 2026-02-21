
-- Update polls table with new features
ALTER TABLE public.polls 
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS is_anonymous BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_multiple_choice BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_change_vote BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS allow_user_options BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS show_results_mode TEXT DEFAULT 'after_vote' CHECK (show_results_mode IN ('immediately', 'after_vote', 'after_end')),
ADD COLUMN IF NOT EXISTS allow_comments BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'everyone' CHECK (visibility IN ('everyone', 'friends', 'only_me')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
ADD COLUMN IF NOT EXISTS reviewed_by UUID,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Create poll_comments table
CREATE TABLE IF NOT EXISTS public.poll_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create poll_user_options table for user-submitted options
CREATE TABLE IF NOT EXISTS public.poll_user_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  option_text TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.poll_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_user_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for poll_comments
CREATE POLICY "Anyone can view poll comments" 
ON public.poll_comments 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can create poll comments" 
ON public.poll_comments 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own poll comments" 
ON public.poll_comments 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for poll_user_options
CREATE POLICY "Anyone can view poll user options" 
ON public.poll_user_options 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can add poll options" 
ON public.poll_user_options 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Update polls RLS to only show approved polls (or own pending polls)
DROP POLICY IF EXISTS "Anyone can view polls" ON public.polls;

CREATE POLICY "Anyone can view approved polls or own polls" 
ON public.polls 
FOR SELECT 
USING (status = 'approved' OR auth.uid() = user_id);

-- Update poll_votes to allow multiple votes if enabled
-- First, let's check if there's a unique constraint on poll_id + user_id and potentially remove it
-- Note: We'll handle this in application logic instead

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_polls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for polls updated_at
DROP TRIGGER IF EXISTS update_polls_updated_at_trigger ON public.polls;
CREATE TRIGGER update_polls_updated_at_trigger
BEFORE UPDATE ON public.polls
FOR EACH ROW
EXECUTE FUNCTION public.update_polls_updated_at();

-- Add index for faster querying
CREATE INDEX IF NOT EXISTS idx_polls_status ON public.polls(status);
CREATE INDEX IF NOT EXISTS idx_polls_user_id ON public.polls(user_id);
CREATE INDEX IF NOT EXISTS idx_poll_comments_poll_id ON public.poll_comments(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_user_options_poll_id ON public.poll_user_options(poll_id);

-- Enable realtime for polls
ALTER PUBLICATION supabase_realtime ADD TABLE public.polls;
