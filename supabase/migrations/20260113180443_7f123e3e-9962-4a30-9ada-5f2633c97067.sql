-- Drop existing delete policy
DROP POLICY IF EXISTS "Users can delete their own reels" ON public.reels;

-- Create new delete policy that allows owners and admins/moderators
CREATE POLICY "Users and admins can delete reels"
ON public.reels
FOR DELETE
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);