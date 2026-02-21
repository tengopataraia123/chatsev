-- Add UPDATE policy for story_reactions to allow upsert operations
CREATE POLICY "Users can update their own reactions"
ON public.story_reactions
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);