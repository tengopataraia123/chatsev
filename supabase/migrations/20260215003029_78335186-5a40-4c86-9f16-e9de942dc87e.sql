
-- Add status column to stories (pending → approved → rejected)
ALTER TABLE public.stories ADD COLUMN status text NOT NULL DEFAULT 'pending';

-- Set all existing stories as approved
UPDATE public.stories SET status = 'approved';

-- Drop old SELECT policies
DROP POLICY IF EXISTS "Anyone can view non-expired stories" ON public.stories;
DROP POLICY IF EXISTS "Authenticated users can view active stories" ON public.stories;

-- New SELECT: regular users see only approved+non-expired stories (or their own)
CREATE POLICY "Users see approved stories or own"
ON public.stories FOR SELECT
USING (
  (status = 'approved' AND expires_at > now())
  OR user_id = auth.uid()
  OR has_role(auth.uid(), 'moderator'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'super_admin'::app_role)
);
