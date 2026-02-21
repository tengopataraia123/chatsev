-- ==============================================
-- ANNOUNCEMENTS MODULE - Database Schema
-- ==============================================

-- Create enum for announcement status
CREATE TYPE public.announcement_status AS ENUM ('draft', 'published', 'archived');

-- Create enum for audience type
CREATE TYPE public.announcement_audience AS ENUM ('all_users');

-- ==============================================
-- Main announcements table
-- ==============================================
CREATE TABLE public.announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  content_html TEXT NOT NULL,
  content_json JSONB,
  status announcement_status NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 0,
  audience announcement_audience NOT NULL DEFAULT 'all_users',
  publish_start TIMESTAMPTZ,
  publish_end TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- Announcement attachments table
-- ==============================================
CREATE TABLE public.announcement_attachments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  storage_path TEXT NOT NULL,
  public_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================
-- Per-user read/dismiss state table
-- ==============================================
CREATE TABLE public.announcement_user_state (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(announcement_id, user_id)
);

-- ==============================================
-- Indexes for performance
-- ==============================================
CREATE INDEX idx_announcements_status ON public.announcements(status);
CREATE INDEX idx_announcements_priority ON public.announcements(priority DESC);
CREATE INDEX idx_announcements_publish_dates ON public.announcements(publish_start, publish_end);
CREATE INDEX idx_announcement_attachments_announcement ON public.announcement_attachments(announcement_id);
CREATE INDEX idx_announcement_user_state_user ON public.announcement_user_state(user_id);
CREATE INDEX idx_announcement_user_state_announcement ON public.announcement_user_state(announcement_id);

-- ==============================================
-- Updated_at trigger function
-- ==============================================
CREATE OR REPLACE FUNCTION public.update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_announcements_updated_at
BEFORE UPDATE ON public.announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_announcements_updated_at();

CREATE TRIGGER update_announcement_user_state_updated_at
BEFORE UPDATE ON public.announcement_user_state
FOR EACH ROW
EXECUTE FUNCTION public.update_announcements_updated_at();

-- ==============================================
-- Enable RLS on all tables
-- ==============================================
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_user_state ENABLE ROW LEVEL SECURITY;

-- ==============================================
-- RLS Policies for announcements (Admin CRUD)
-- ==============================================

-- Super Admins can do all operations on announcements
CREATE POLICY "Super admins can manage announcements"
ON public.announcements
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- All authenticated users can read published announcements
CREATE POLICY "Users can read active published announcements"
ON public.announcements
FOR SELECT
TO authenticated
USING (
  status = 'published'
  AND (publish_start IS NULL OR publish_start <= now())
  AND (publish_end IS NULL OR publish_end > now())
);

-- ==============================================
-- RLS Policies for announcement_attachments
-- ==============================================

-- Super Admins can manage attachments
CREATE POLICY "Super admins can manage announcement attachments"
ON public.announcement_attachments
FOR ALL
TO authenticated
USING (public.is_super_admin(auth.uid()))
WITH CHECK (public.is_super_admin(auth.uid()));

-- Users can read attachments for visible announcements
CREATE POLICY "Users can read attachments for published announcements"
ON public.announcement_attachments
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.announcements a
    WHERE a.id = announcement_id
    AND a.status = 'published'
    AND (a.publish_start IS NULL OR a.publish_start <= now())
    AND (a.publish_end IS NULL OR a.publish_end > now())
  )
);

-- ==============================================
-- RLS Policies for announcement_user_state
-- ==============================================

-- Users can read/write their own state
CREATE POLICY "Users can manage their own announcement state"
ON public.announcement_user_state
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Super Admins can read all state (for analytics)
CREATE POLICY "Super admins can read all announcement state"
ON public.announcement_user_state
FOR SELECT
TO authenticated
USING (public.is_super_admin(auth.uid()));

-- ==============================================
-- RPC Functions for user actions
-- ==============================================

-- Mark announcement as read
CREATE OR REPLACE FUNCTION public.mark_announcement_read(p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.announcement_user_state (announcement_id, user_id, is_read, read_at)
  VALUES (p_announcement_id, auth.uid(), true, now())
  ON CONFLICT (announcement_id, user_id) 
  DO UPDATE SET is_read = true, read_at = COALESCE(announcement_user_state.read_at, now()), updated_at = now();
  
  RETURN true;
END;
$$;

-- Dismiss announcement for user
CREATE OR REPLACE FUNCTION public.dismiss_announcement(p_announcement_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.announcement_user_state (announcement_id, user_id, is_read, read_at, is_dismissed, dismissed_at)
  VALUES (p_announcement_id, auth.uid(), true, now(), true, now())
  ON CONFLICT (announcement_id, user_id) 
  DO UPDATE SET 
    is_read = true,
    read_at = COALESCE(announcement_user_state.read_at, now()),
    is_dismissed = true, 
    dismissed_at = now(), 
    updated_at = now();
  
  RETURN true;
END;
$$;

-- Get active announcements for current user (with state)
CREATE OR REPLACE FUNCTION public.get_active_announcements()
RETURNS TABLE (
  id UUID,
  title VARCHAR(120),
  content_html TEXT,
  priority INTEGER,
  publish_start TIMESTAMPTZ,
  publish_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_read BOOLEAN,
  is_dismissed BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    a.id,
    a.title,
    a.content_html,
    a.priority,
    a.publish_start,
    a.publish_end,
    a.created_at,
    COALESCE(aus.is_read, false) AS is_read,
    COALESCE(aus.is_dismissed, false) AS is_dismissed
  FROM public.announcements a
  LEFT JOIN public.announcement_user_state aus 
    ON a.id = aus.announcement_id AND aus.user_id = auth.uid()
  WHERE a.status = 'published'
    AND (a.publish_start IS NULL OR a.publish_start <= now())
    AND (a.publish_end IS NULL OR a.publish_end > now())
    AND COALESCE(aus.is_dismissed, false) = false
  ORDER BY a.priority DESC, a.created_at DESC;
END;
$$;

-- ==============================================
-- Enable realtime for user state changes
-- ==============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.announcement_user_state;