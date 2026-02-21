-- Allow profile owners to delete their own visitor records
CREATE POLICY "Profile owners can delete visitors"
ON public.profile_visits
FOR DELETE
USING (auth.uid() = profile_user_id);