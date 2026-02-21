
-- Create reports table for global reporting system
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_user_id UUID NOT NULL,
  reported_user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('private_message', 'group_message', 'post', 'photo', 'video', 'story', 'comment', 'reel', 'profile', 'live_comment')),
  content_id TEXT NOT NULL,
  reason_type TEXT CHECK (reason_type IN ('spam', 'harassment', 'inappropriate', 'fraud', 'violence', 'other')),
  reason_text TEXT NOT NULL CHECK (char_length(reason_text) >= 5),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_by_admin_id UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  content_preview TEXT
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Policy: Users can create reports
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
WITH CHECK (auth.uid() = reporter_user_id);

-- Policy: Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
USING (auth.uid() = reporter_user_id);

-- Policy: Admins/Moderators can view all reports
CREATE POLICY "Admins can view all reports"
ON public.reports
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);

-- Policy: Admins/Moderators can update reports
CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin', 'moderator')
  )
);

-- Prevent duplicate reports on same content by same user
CREATE UNIQUE INDEX idx_reports_unique_per_user 
ON public.reports (reporter_user_id, content_type, content_id) 
WHERE status IN ('new', 'reviewing');

-- Index for efficient queries
CREATE INDEX idx_reports_status ON public.reports (status);
CREATE INDEX idx_reports_created_at ON public.reports (created_at DESC);
CREATE INDEX idx_reports_content_type ON public.reports (content_type);
