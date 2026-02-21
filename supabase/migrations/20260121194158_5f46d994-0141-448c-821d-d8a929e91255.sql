-- Drop old restrictive policy
DROP POLICY IF EXISTS "Anyone can read active questions" ON public.quiz_v2_questions;

-- Create new permissive policy for reading questions
CREATE POLICY "Public read active questions" 
ON public.quiz_v2_questions 
FOR SELECT 
TO authenticated, anon
USING (is_active = true);