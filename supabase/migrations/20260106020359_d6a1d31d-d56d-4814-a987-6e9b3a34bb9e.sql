-- Add is_approved column to profiles for user registration approval
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean DEFAULT false;

-- Create pending_approvals table for all content moderation
CREATE TABLE public.pending_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL, -- 'registration', 'post', 'story', 'reel', 'avatar', 'cover', 'post_image', 'post_video'
  user_id UUID NOT NULL,
  content_id UUID, -- ID of the content (post_id, story_id, reel_id, etc.)
  content_data JSONB, -- Additional data like image_url, video_url, etc.
  ip_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  reviewed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.pending_approvals ENABLE ROW LEVEL SECURITY;

-- Admins, super_admins, and moderators can view all pending approvals
CREATE POLICY "Admins can view pending approvals"
ON public.pending_approvals
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator')
);

-- Admins, super_admins, and moderators can update pending approvals
CREATE POLICY "Admins can update pending approvals"
ON public.pending_approvals
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator')
);

-- Admins, super_admins, and moderators can delete pending approvals
CREATE POLICY "Admins can delete pending approvals"
ON public.pending_approvals
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin') OR
  public.has_role(auth.uid(), 'admin') OR
  public.has_role(auth.uid(), 'moderator')
);

-- Anyone can insert pending approvals (when creating content)
CREATE POLICY "Anyone can create pending approvals"
ON public.pending_approvals
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for pending_approvals
ALTER PUBLICATION supabase_realtime ADD TABLE public.pending_approvals;

-- Create index for faster queries
CREATE INDEX idx_pending_approvals_status ON public.pending_approvals(status);
CREATE INDEX idx_pending_approvals_type ON public.pending_approvals(type);
CREATE INDEX idx_pending_approvals_user_id ON public.pending_approvals(user_id);