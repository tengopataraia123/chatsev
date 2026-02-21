-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own posts" ON public.posts;

-- Create new update policy that allows admins to approve posts
CREATE POLICY "Users can update their own posts or admins can approve" 
ON public.posts 
FOR UPDATE 
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'super_admin')
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'moderator')
);