-- Drop the foreign key constraint on post_id to allow storing any ID
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_post_id_fkey;