-- Drop the old constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with relationship notification types
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  'like'::text, 
  'comment'::text, 
  'follow'::text, 
  'friend_request'::text, 
  'friend_accept'::text, 
  'mention'::text, 
  'message'::text, 
  'group_chat_reply'::text, 
  'group_chat_reaction'::text, 
  'group_chat_mention'::text, 
  'private_group_message'::text,
  'relationship_proposal'::text,
  'relationship_accepted'::text,
  'relationship_rejected'::text,
  'relationship_ended'::text,
  'story_like'::text,
  'story_comment'::text,
  'poll_vote'::text,
  'blog_like'::text,
  'blog_comment'::text,
  'video_like'::text,
  'video_comment'::text,
  'photo_like'::text,
  'photo_comment'::text,
  'story_expired'::text
]));