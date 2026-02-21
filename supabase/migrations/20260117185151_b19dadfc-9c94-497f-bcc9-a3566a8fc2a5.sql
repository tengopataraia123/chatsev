
-- Fix quizzes table RLS policies for all admin roles
DROP POLICY IF EXISTS "Super admins can delete any quiz" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can delete any quiz" ON public.quizzes;
DROP POLICY IF EXISTS "Admins can update any quiz" ON public.quizzes;

CREATE POLICY "Admins can delete any quiz"
ON public.quizzes FOR DELETE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

CREATE POLICY "Admins can update any quiz"
ON public.quizzes FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));

-- Fix polls table - add update policy for admins
DROP POLICY IF EXISTS "Admins can update any poll" ON public.polls;

CREATE POLICY "Admins can update any poll"
ON public.polls FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'))
WITH CHECK (auth.uid() = user_id OR has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'moderator'));
