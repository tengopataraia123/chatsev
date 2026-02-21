
-- Drop all groups-related tables (CASCADE to handle foreign keys)
DROP TABLE IF EXISTS public.group_comment_reactions CASCADE;
DROP TABLE IF EXISTS public.group_post_reactions CASCADE;
DROP TABLE IF EXISTS public.group_post_comments CASCADE;
DROP TABLE IF EXISTS public.group_poll_votes CASCADE;
DROP TABLE IF EXISTS public.group_polls CASCADE;
DROP TABLE IF EXISTS public.group_event_attendees CASCADE;
DROP TABLE IF EXISTS public.group_events CASCADE;
DROP TABLE IF EXISTS public.group_files CASCADE;
DROP TABLE IF EXISTS public.group_media CASCADE;
DROP TABLE IF EXISTS public.group_notifications CASCADE;
DROP TABLE IF EXISTS public.group_invite_rate_limits CASCADE;
DROP TABLE IF EXISTS public.group_invites CASCADE;
DROP TABLE IF EXISTS public.group_banned_members CASCADE;
DROP TABLE IF EXISTS public.group_join_requests CASCADE;
DROP TABLE IF EXISTS public.group_posts CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
