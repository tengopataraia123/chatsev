-- Drop existing delete policy if exists
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
DROP POLICY IF EXISTS "Admins can delete any story" ON public.stories;

-- Create policy for users to delete their own stories
CREATE POLICY "Users can delete their own stories"
ON public.stories
FOR DELETE
USING (auth.uid() = user_id);

-- Create policy for admins/moderators to delete any story
CREATE POLICY "Admins can delete any story"
ON public.stories
FOR DELETE
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);