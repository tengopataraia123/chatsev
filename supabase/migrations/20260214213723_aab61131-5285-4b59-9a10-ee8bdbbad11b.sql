
-- Fix user_points_wallet - policy already exists, just drop the ALL and add specific ones
DROP POLICY IF EXISTS "System can manage wallets" ON public.user_points_wallet;
DROP POLICY IF EXISTS "System manages wallets via functions" ON public.user_points_wallet;

-- The award_points and other SECURITY DEFINER functions bypass RLS,
-- so we only need user-facing policies
CREATE POLICY "Users can manage own wallet"
ON public.user_points_wallet FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own wallet"
ON public.user_points_wallet FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
