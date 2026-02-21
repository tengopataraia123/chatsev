-- Drop existing insert policy on quizzes
DROP POLICY IF EXISTS "Users can create quizzes" ON public.quizzes;

-- Create new policy: Only super_admin can create quizzes
CREATE POLICY "Only super admins can create quizzes"
ON public.quizzes
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'super_admin')
);

-- Update delete policy to allow super_admin as well
DROP POLICY IF EXISTS "Users can delete their quizzes" ON public.quizzes;

CREATE POLICY "Super admins can delete any quiz"
ON public.quizzes
FOR DELETE
TO authenticated
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin')
);

-- Also update quiz_questions insert policy
DROP POLICY IF EXISTS "Quiz owners can add questions" ON public.quiz_questions;

CREATE POLICY "Super admins can add quiz questions"
ON public.quiz_questions
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quizzes 
    WHERE id = quiz_id 
    AND (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
);

-- Update quiz_answers insert policy
DROP POLICY IF EXISTS "Quiz owners can add answers" ON public.quiz_answers;

CREATE POLICY "Super admins can add quiz answers"
ON public.quiz_answers
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_questions q
    JOIN public.quizzes quiz ON quiz.id = q.quiz_id
    WHERE q.id = question_id 
    AND (quiz.user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'))
  )
);