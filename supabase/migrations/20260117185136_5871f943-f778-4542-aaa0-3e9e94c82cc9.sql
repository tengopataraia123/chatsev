
-- Fix stories table RLS policies
DROP POLICY IF EXISTS "Admins can delete any story" ON public.stories;
DROP POLICY IF EXISTS "Users can delete their stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON public.stories;
DROP POLICY IF EXISTS "Admins can manage all stories" ON public.stories;
DROP POLICY IF EXISTS "Users can delete own stories" ON public.stories;
DROP POLICY IF EXISTS "Users can update own stories" ON public.stories;

CREATE POLICY "Admins can manage all stories"
ON public.stories FOR ALL TO authenticated
USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
WITH CHECK (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Users can delete own stories"
ON public.stories FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stories"
ON public.stories FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
