
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type = ANY (ARRAY[
  'like','comment','follow','friend_request','friend_accept','mention','message','ignore',
  'reaction','post_reaction','content_approved','content_rejected','live_started',
  'group_chat_reply','group_chat_reaction','group_chat_mention','private_group_message',
  'relationship_proposal','relationship_accepted','relationship_rejected','relationship_ended',
  'story_like','story_comment','story_reaction','story_expired',
  'reel_like','reel_comment','poll_vote',
  'blog_like','blog_comment','video_like','video_comment','photo_like','photo_comment',
  'friend_post','friend_photo','friend_video','friend_story','friend_reel',
  'friend_avatar_change','friend_cover_change','friend_poll','friend_quiz',
  'group_invite','group_join_request','group_post','group_member_joined',
  'group_invite_accepted','group_request_approved',
  'dating_match','dating_like','dating_super_like','dating_message',
  'game_friend_request','game_friend_accepted','game_friend_declined',
  'game_invite','game_invite_accepted','game_invite_declined',
  'gift_received'
]));
