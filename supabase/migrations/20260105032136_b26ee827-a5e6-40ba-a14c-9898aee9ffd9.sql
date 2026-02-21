-- Allow admins to delete any private message
CREATE POLICY "Admins can delete any private message"
ON public.private_messages
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Allow admins to delete any comment
CREATE POLICY "Admins can delete any comment"
ON public.post_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);

-- Allow admins to delete any reply
CREATE POLICY "Admins can delete any reply"
ON public.comment_replies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator')
  )
);