-- Add UPDATE policy for story_views to allow upsert to work properly
CREATE POLICY "Users can update their own views"
ON public.story_views
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);