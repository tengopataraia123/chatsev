-- Update delete policy: only owner or super_admin can delete posts
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.posts;

CREATE POLICY "Users can delete their own posts or super_admin"
ON public.posts
FOR DELETE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role)
);