
-- FIX 1: Set search_path on all functions missing it
ALTER FUNCTION public.award_points(uuid, integer, text, text, text) SET search_path = public;
ALTER FUNCTION public.claim_daily_login_points(uuid) SET search_path = public;
ALTER FUNCTION public.get_user_site_ban(uuid) SET search_path = public;
ALTER FUNCTION public.send_gift_with_points(uuid, uuid, uuid, text, boolean) SET search_path = public;
ALTER FUNCTION public.trg_award_comment_points() SET search_path = public;
ALTER FUNCTION public.trg_award_like_points() SET search_path = public;
ALTER FUNCTION public.trg_award_post_points() SET search_path = public;
ALTER FUNCTION public.update_durak_lobby_updated_at() SET search_path = public;
ALTER FUNCTION public.update_mood_streak() SET search_path = public;
