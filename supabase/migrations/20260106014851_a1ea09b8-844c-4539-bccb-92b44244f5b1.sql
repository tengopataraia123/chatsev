-- Drop the existing delete policy
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

-- Create updated delete policy that includes super_admin and moderator
CREATE POLICY "Users can delete their own posts" 
ON public.posts 
FOR DELETE 
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'moderator'::app_role)
);