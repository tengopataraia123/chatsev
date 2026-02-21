-- First, delete duplicate notifications keeping only the oldest one
DELETE FROM public.notifications n1
USING public.notifications n2
WHERE n1.id > n2.id
  AND n1.user_id = n2.user_id
  AND n1.from_user_id = n2.from_user_id
  AND n1.type = n2.type
  AND COALESCE(n1.post_id, '00000000-0000-0000-0000-000000000000') = COALESCE(n2.post_id, '00000000-0000-0000-0000-000000000000');

-- Create a unique index to prevent duplicate notifications
-- This will prevent the same notification from being sent multiple times
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_unique_content
ON public.notifications (user_id, from_user_id, type, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'));