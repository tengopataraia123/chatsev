-- Add SELECT policy for users to see their own device records (needed for UPSERT to work)
CREATE POLICY "Users can view their own device"
ON public.device_accounts
FOR SELECT
USING (auth.uid() = user_id);