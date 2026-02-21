-- Drop old constraint and add updated one with ALL notification types
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check 
CHECK (type = ANY (ARRAY[
  -- Basic notifications
  'like'::text, 
  'comment'::text, 
  'follow'::text, 
  'friend_request'::text, 
  'friend_accept'::text, 
  'mention'::text, 
  'message'::text,
  'ignore'::text,
  'reaction'::text,
  'post_reaction'::text,
  'content_approved'::text,
  'content_rejected'::text,
  'live_started'::text,
  
  -- Group chat notifications
  'group_chat_reply'::text, 
  'group_chat_reaction'::text, 
  'group_chat_mention'::text, 
  'private_group_message'::text,
  
  -- Relationship notifications
  'relationship_proposal'::text, 
  'relationship_accepted'::text, 
  'relationship_rejected'::text, 
  'relationship_ended'::text,
  
  -- Story notifications
  'story_like'::text, 
  'story_comment'::text, 
  'story_reaction'::text,
  'story_expired'::text,
  
  -- Reel notifications
  'reel_like'::text, 
  'reel_comment'::text,
  
  -- Poll/Blog/Video/Photo notifications
  'poll_vote'::text, 
  'blog_like'::text, 
  'blog_comment'::text, 
  'video_like'::text, 
  'video_comment'::text, 
  'photo_like'::text, 
  'photo_comment'::text,
  
  -- Friend activity notifications
  'friend_post'::text, 
  'friend_photo'::text, 
  'friend_video'::text, 
  'friend_story'::text, 
  'friend_reel'::text, 
  'friend_avatar_change'::text, 
  'friend_cover_change'::text, 
  'friend_poll'::text, 
  'friend_quiz'::text,
  
  -- Group notifications
  'group_invite'::text, 
  'group_join_request'::text, 
  'group_post'::text, 
  'group_member_joined'::text, 
  'group_invite_accepted'::text, 
  'group_request_approved'::text,
  
  -- Dating notifications
  'dating_match'::text,
  'dating_like'::text,
  'dating_super_like'::text,
  'dating_message'::text,
  
  -- Game friend notifications
  'game_friend_request'::text,
  'game_friend_accepted'::text,
  'game_friend_declined'::text,
  
  -- Game invite notifications
  'game_invite'::text,
  'game_invite_accepted'::text,
  'game_invite_declined'::text
]));