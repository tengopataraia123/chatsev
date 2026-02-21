-- Drop the old restrictive update policy
DROP POLICY IF EXISTS "Users can update their own reels" ON public.reels;

-- Create new policy that allows owners and admins to update reels
CREATE POLICY "Users and admins can update reels" 
ON public.reels 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role) 
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
);