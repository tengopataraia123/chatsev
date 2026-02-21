-- Add policy for visitors to view their own visits
CREATE POLICY "Visitors can view their own visits"
ON public.profile_visits
FOR SELECT
USING (auth.uid() = visitor_user_id);