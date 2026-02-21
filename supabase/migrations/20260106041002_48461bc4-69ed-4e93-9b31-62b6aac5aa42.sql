-- Drop the existing check constraint on notifications type
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated check constraint that includes all notification types
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
  'like', 
  'comment', 
  'follow', 
  'friend_request', 
  'friend_accept', 
  'mention',
  'message',
  'group_chat_reply',
  'group_chat_reaction', 
  'group_chat_mention',
  'private_group_message'
));