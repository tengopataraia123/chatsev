DROP POLICY IF EXISTS "Users can delete their own posts or super_admin" ON public.posts;

CREATE POLICY "Users can delete own posts or admin roles"
ON public.posts
FOR DELETE
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'super_admin'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'moderator'::app_role)
);