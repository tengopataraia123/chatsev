-- Update RLS policies for post_comments to include super_admin
DROP POLICY IF EXISTS "Admins can delete any comment" ON public.post_comments;
CREATE POLICY "Admins can delete any comment"
ON public.post_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator', 'super_admin')
  )
);

-- Update RLS policies for comment_replies to include super_admin
DROP POLICY IF EXISTS "Admins can delete any reply" ON public.comment_replies;
CREATE POLICY "Admins can delete any reply"
ON public.comment_replies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
    AND user_roles.role IN ('admin', 'moderator', 'super_admin')
  )
);

-- Also update story_comments if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'story_comments') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Admins can delete any story comment" ON public.story_comments';
    EXECUTE 'CREATE POLICY "Admins can delete any story comment"
    ON public.story_comments
    FOR DELETE
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN (''admin'', ''moderator'', ''super_admin'')
      )
    )';
  END IF;
END
$$;