
-- Add policy to allow users to see their own views (needed for upsert to work)
CREATE POLICY "Users can see their own views"
ON public.story_views
FOR SELECT
USING (auth.uid() = user_id);
