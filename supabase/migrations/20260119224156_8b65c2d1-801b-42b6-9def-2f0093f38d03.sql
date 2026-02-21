-- Drop existing policies
DROP POLICY IF EXISTS "Users can track their own device" ON public.device_accounts;
DROP POLICY IF EXISTS "Users can update their own device tracking" ON public.device_accounts;

-- Create better INSERT policy
CREATE POLICY "Users can insert their own device"
ON public.device_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create UPDATE policy with proper with_check clause
CREATE POLICY "Users can update their own device"
ON public.device_accounts
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);