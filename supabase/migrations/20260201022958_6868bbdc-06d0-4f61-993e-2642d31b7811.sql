
-- Fix story_mutes INSERT policy with proper WITH CHECK
DROP POLICY IF EXISTS "Users can insert own mutes" ON public.story_mutes;
CREATE POLICY "Users can insert own mutes"
ON public.story_mutes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Fix story_hidden INSERT policy with proper WITH CHECK
DROP POLICY IF EXISTS "Users can insert own hidden" ON public.story_hidden;
CREATE POLICY "Users can insert own hidden"
ON public.story_hidden
FOR INSERT
WITH CHECK (auth.uid() = user_id);
