
-- Fix SECURITY DEFINER views by setting security_invoker = true
-- This ensures views use the permissions of the querying user, not the view creator

-- www_leaderboard - public leaderboard, safe to use invoker since www_user_stats 
-- has its own RLS/permissions
ALTER VIEW public.www_leaderboard SET (security_invoker = true);

-- storage_usage_stats - accesses storage.objects, used by admin functions
-- Setting to security_invoker means only users with storage access can query it
ALTER VIEW public.storage_usage_stats SET (security_invoker = true);
