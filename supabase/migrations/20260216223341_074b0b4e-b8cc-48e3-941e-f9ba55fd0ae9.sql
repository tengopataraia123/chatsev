
-- Add columns to preserve original content before deletion
ALTER TABLE public.messenger_messages
ADD COLUMN IF NOT EXISTS original_content TEXT,
ADD COLUMN IF NOT EXISTS original_image_urls TEXT[],
ADD COLUMN IF NOT EXISTS original_video_url TEXT,
ADD COLUMN IF NOT EXISTS original_voice_url TEXT,
ADD COLUMN IF NOT EXISTS original_file_url TEXT,
ADD COLUMN IF NOT EXISTS original_gif_id UUID,
ADD COLUMN IF NOT EXISTS deleted_by_user_id UUID;

-- Create table to track conversation "deletions" (soft delete)
CREATE TABLE IF NOT EXISTS public.messenger_conversation_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.messenger_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  deleted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

ALTER TABLE public.messenger_conversation_deletions ENABLE ROW LEVEL SECURITY;

-- Users can insert their own deletion records
CREATE POLICY "Users can mark conversations as deleted"
ON public.messenger_conversation_deletions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can see their own deletion records
CREATE POLICY "Users can see own deletions"
ON public.messenger_conversation_deletions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Super admins (CHEGE/PIKASO) can see all deletions
CREATE POLICY "Super admins can see all deletions"
ON public.messenger_conversation_deletions
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role = 'super_admin'::app_role
  )
);

-- Users can delete their own deletion records (to "undelete")
CREATE POLICY "Users can remove own deletions"
ON public.messenger_conversation_deletions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
