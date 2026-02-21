
-- FIX 2: Tighten overly permissive RLS policies

DROP POLICY IF EXISTS "System can insert violations" ON public.ad_violations;
CREATE POLICY "Authenticated users can insert own violations"
ON public.ad_violations FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service can insert analytics" ON public.analytics_events;
CREATE POLICY "Users can insert own analytics"
ON public.analytics_events FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Anyone can create views" ON public.blog_views;
CREATE POLICY "Anyone can create blog views"
ON public.blog_views FOR INSERT
WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert play history" ON public.dj_play_history;
CREATE POLICY "Authenticated users can insert play history"
ON public.dj_play_history FOR INSERT TO authenticated
WITH CHECK (auth.uid() = requested_by_user_id);

-- durak_games: players is JSONB array, use ? operator
DROP POLICY IF EXISTS "Authenticated users can insert durak games" ON public.durak_games;
CREATE POLICY "Players can insert durak games"
ON public.durak_games FOR INSERT TO authenticated
WITH CHECK (players ? auth.uid()::text);

DROP POLICY IF EXISTS "Authenticated users can update durak games" ON public.durak_games;
CREATE POLICY "Players can update durak games"
ON public.durak_games FOR UPDATE TO authenticated
USING (players ? auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can record photo view" ON public.photo_views;
CREATE POLICY "Authenticated users can record photo views"
ON public.photo_views FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert storage usage" ON public.storage_usage_log;
CREATE POLICY "Admins can insert storage usage"
ON public.storage_usage_log FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
