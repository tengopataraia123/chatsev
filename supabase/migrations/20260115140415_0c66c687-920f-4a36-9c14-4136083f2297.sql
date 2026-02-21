-- Add policy for story owners to delete comments on their stories
CREATE POLICY "Story owners can delete comments on their stories"
ON public.story_comments
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM stories 
    WHERE stories.id = story_comments.story_id 
    AND stories.user_id = auth.uid()
  )
);