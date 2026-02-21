
-- Fix 1: Drop the OLD duplicate award_points function (with uuid reference_id)
DROP FUNCTION IF EXISTS public.award_points(uuid, integer, text, text, uuid);

-- Fix 2: Drop the overly restrictive unique notification index
-- It blocks multiple notifications of the same type from the same sender
DROP INDEX IF EXISTS idx_notifications_unique_content;

-- Recreate with a less restrictive unique index that includes related_id
-- This allows multiple gift notifications from the same sender but still prevents
-- exact duplicate notifications (same type, same sender, same related content)
CREATE UNIQUE INDEX idx_notifications_unique_content 
ON public.notifications (user_id, from_user_id, type, COALESCE(post_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(related_id, '00000000-0000-0000-0000-000000000000'::uuid));
