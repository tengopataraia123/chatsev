-- Add parent_id column to existing poll_comments table
ALTER TABLE public.poll_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.poll_comments(id) ON DELETE CASCADE;

-- Create index for parent_id
CREATE INDEX IF NOT EXISTS idx_poll_comments_parent_id ON public.poll_comments(parent_id);

-- Upgrade polls table with new FB-style features
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'feed';
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS context_id uuid;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS max_selections integer DEFAULT 3;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS is_pinned boolean DEFAULT false;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS closed_at timestamp with time zone;
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS total_votes integer DEFAULT 0;

-- Create poll_options table for structured options with images
CREATE TABLE IF NOT EXISTS public.poll_options (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  text text NOT NULL,
  emoji text,
  image_url text,
  position integer NOT NULL DEFAULT 0,
  votes_count integer DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for poll options
CREATE INDEX IF NOT EXISTS idx_poll_options_poll_id ON public.poll_options(poll_id);

-- Create poll_moderation table for audit log
CREATE TABLE IF NOT EXISTS public.poll_moderation (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for poll moderation
CREATE INDEX IF NOT EXISTS idx_poll_moderation_poll_id ON public.poll_moderation(poll_id);

-- Add option_id to poll_votes for structured option voting
ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS option_id uuid REFERENCES public.poll_options(id) ON DELETE CASCADE;

-- Enable RLS on new tables
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_moderation ENABLE ROW LEVEL SECURITY;

-- Poll options policies - everyone can read, only poll owner can manage
DROP POLICY IF EXISTS "Anyone can view poll options" ON public.poll_options;
CREATE POLICY "Anyone can view poll options" ON public.poll_options FOR SELECT USING (true);

DROP POLICY IF EXISTS "Poll owners can manage options" ON public.poll_options;
CREATE POLICY "Poll owners can manage options" ON public.poll_options FOR ALL USING (
  EXISTS (SELECT 1 FROM public.polls WHERE polls.id = poll_options.poll_id AND polls.user_id = auth.uid())
);

-- Poll moderation policies - only admins can access
DROP POLICY IF EXISTS "Admins can view poll moderation" ON public.poll_moderation;
CREATE POLICY "Admins can view poll moderation" ON public.poll_moderation FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator'))
);

DROP POLICY IF EXISTS "Admins can create poll moderation" ON public.poll_moderation;
CREATE POLICY "Admins can create poll moderation" ON public.poll_moderation FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin', 'moderator'))
);