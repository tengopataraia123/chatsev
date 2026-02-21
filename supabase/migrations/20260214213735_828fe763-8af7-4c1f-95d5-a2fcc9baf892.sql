
-- Fix admin_ratings
DROP POLICY IF EXISTS "System can manage ratings" ON public.admin_ratings;
CREATE POLICY "Admins can manage ratings"
ON public.admin_ratings FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix gossip_leaderboard
DROP POLICY IF EXISTS "System manages leaderboard" ON public.gossip_leaderboard;
CREATE POLICY "Admins can manage gossip leaderboard"
ON public.gossip_leaderboard FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
