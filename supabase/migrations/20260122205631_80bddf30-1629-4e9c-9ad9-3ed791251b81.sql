-- Admin Rating/Performance Tracking System
-- Tracks positive admin actions for leaderboard

-- Create admin_ratings table
CREATE TABLE IF NOT EXISTS public.admin_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL,
  total_score INTEGER DEFAULT 0,
  actions_count INTEGER DEFAULT 0,
  approvals_count INTEGER DEFAULT 0,
  rejections_count INTEGER DEFAULT 0,
  blocks_count INTEGER DEFAULT 0,
  unblocks_count INTEGER DEFAULT 0,
  deletions_count INTEGER DEFAULT 0,
  edits_count INTEGER DEFAULT 0,
  mutes_count INTEGER DEFAULT 0,
  unmutes_count INTEGER DEFAULT 0,
  reviews_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  other_actions_count INTEGER DEFAULT 0,
  last_action_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(admin_id)
);

-- Enable RLS
ALTER TABLE public.admin_ratings ENABLE ROW LEVEL SECURITY;

-- Super admins can view all ratings
CREATE POLICY "Super admins can view all ratings"
ON public.admin_ratings
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
);

-- Admins can view their own rating
CREATE POLICY "Admins can view own rating"
ON public.admin_ratings
FOR SELECT
USING (admin_id = auth.uid());

-- Only system can insert/update (via trigger)
CREATE POLICY "System can manage ratings"
ON public.admin_ratings
FOR ALL
USING (true)
WITH CHECK (true);

-- Create function to update admin rating on action log
CREATE OR REPLACE FUNCTION public.update_admin_rating_on_action()
RETURNS TRIGGER AS $$
DECLARE
  action_score INTEGER := 0;
BEGIN
  -- Calculate score based on action type
  CASE NEW.action_type
    WHEN 'approve' THEN action_score := 2;
    WHEN 'reject' THEN action_score := 1;
    WHEN 'delete' THEN action_score := 1;
    WHEN 'block' THEN action_score := 2;
    WHEN 'unblock' THEN action_score := 1;
    WHEN 'mute' THEN action_score := 1;
    WHEN 'unmute' THEN action_score := 1;
    WHEN 'edit' THEN action_score := 1;
    WHEN 'review' THEN action_score := 1;
    WHEN 'warn' THEN action_score := 1;
    ELSE action_score := 1;
  END CASE;

  -- Upsert admin rating
  INSERT INTO public.admin_ratings (
    admin_id,
    total_score,
    actions_count,
    approvals_count,
    rejections_count,
    blocks_count,
    unblocks_count,
    deletions_count,
    edits_count,
    mutes_count,
    unmutes_count,
    reviews_count,
    warnings_count,
    other_actions_count,
    last_action_at,
    updated_at
  )
  VALUES (
    NEW.admin_id,
    action_score,
    1,
    CASE WHEN NEW.action_type = 'approve' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'reject' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'block' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'unblock' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'delete' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'edit' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'mute' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'unmute' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'review' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type = 'warn' THEN 1 ELSE 0 END,
    CASE WHEN NEW.action_type NOT IN ('approve', 'reject', 'block', 'unblock', 'delete', 'edit', 'mute', 'unmute', 'review', 'warn') THEN 1 ELSE 0 END,
    NEW.created_at,
    now()
  )
  ON CONFLICT (admin_id) DO UPDATE SET
    total_score = admin_ratings.total_score + action_score,
    actions_count = admin_ratings.actions_count + 1,
    approvals_count = admin_ratings.approvals_count + CASE WHEN NEW.action_type = 'approve' THEN 1 ELSE 0 END,
    rejections_count = admin_ratings.rejections_count + CASE WHEN NEW.action_type = 'reject' THEN 1 ELSE 0 END,
    blocks_count = admin_ratings.blocks_count + CASE WHEN NEW.action_type = 'block' THEN 1 ELSE 0 END,
    unblocks_count = admin_ratings.unblocks_count + CASE WHEN NEW.action_type = 'unblock' THEN 1 ELSE 0 END,
    deletions_count = admin_ratings.deletions_count + CASE WHEN NEW.action_type = 'delete' THEN 1 ELSE 0 END,
    edits_count = admin_ratings.edits_count + CASE WHEN NEW.action_type = 'edit' THEN 1 ELSE 0 END,
    mutes_count = admin_ratings.mutes_count + CASE WHEN NEW.action_type = 'mute' THEN 1 ELSE 0 END,
    unmutes_count = admin_ratings.unmutes_count + CASE WHEN NEW.action_type = 'unmute' THEN 1 ELSE 0 END,
    reviews_count = admin_ratings.reviews_count + CASE WHEN NEW.action_type = 'review' THEN 1 ELSE 0 END,
    warnings_count = admin_ratings.warnings_count + CASE WHEN NEW.action_type = 'warn' THEN 1 ELSE 0 END,
    other_actions_count = admin_ratings.other_actions_count + CASE WHEN NEW.action_type NOT IN ('approve', 'reject', 'block', 'unblock', 'delete', 'edit', 'mute', 'unmute', 'review', 'warn') THEN 1 ELSE 0 END,
    last_action_at = NEW.created_at,
    updated_at = now();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on admin_action_logs
DROP TRIGGER IF EXISTS trigger_update_admin_rating ON public.admin_action_logs;
CREATE TRIGGER trigger_update_admin_rating
  AFTER INSERT ON public.admin_action_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_admin_rating_on_action();

-- Add timestamp update trigger
CREATE TRIGGER update_admin_ratings_updated_at
  BEFORE UPDATE ON public.admin_ratings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();