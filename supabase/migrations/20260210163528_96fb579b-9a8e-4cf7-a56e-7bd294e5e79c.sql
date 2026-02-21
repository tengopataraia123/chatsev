-- Add fm_match and fm_match_reminder to notifications type check constraint
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (
  type = ANY (ARRAY[
    'like', 'comment', 'follow', 'friend_request', 'friend_accept', 'mention', 'message',
    'ignore', 'reaction', 'post_reaction', 'content_approved', 'content_rejected',
    'live_started', 'group_chat_reply', 'group_chat_reaction', 'group_chat_mention',
    'private_group_message', 'relationship_proposal', 'relationship_accepted',
    'relationship_rejected', 'relationship_ended', 'story_like', 'story_comment',
    'story_reaction', 'story_expired', 'reel_like', 'reel_comment', 'poll_vote',
    'blog_like', 'blog_comment', 'video_like', 'video_comment', 'photo_like',
    'photo_comment', 'friend_post', 'friend_photo', 'friend_video', 'friend_story',
    'friend_reel', 'friend_avatar_change', 'friend_cover_change', 'friend_poll',
    'friend_quiz', 'group_invite', 'group_join_request', 'group_post',
    'group_member_joined', 'group_invite_accepted', 'group_request_approved',
    'dating_match', 'dating_like', 'dating_super_like', 'dating_message',
    'game_friend_request', 'game_friend_accepted', 'game_friend_declined',
    'game_invite', 'game_invite_accepted', 'game_invite_declined', 'gift_received',
    'fm_match', 'fm_match_reminder', 'verification'
  ])
);

-- Fix the start_fm_live_match function to include from_user_id
CREATE OR REPLACE FUNCTION public.start_fm_live_match(p_fixture_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture record;
  v_live_match_id uuid;
  v_home_owner uuid;
  v_away_owner uuid;
BEGIN
  -- Get fixture details
  SELECT f.*, 
         hc.owner_id as home_owner_id,
         ac.owner_id as away_owner_id
  INTO v_fixture
  FROM fm_fixtures f
  JOIN fm_clubs hc ON hc.id = f.home_club_id
  JOIN fm_clubs ac ON ac.id = f.away_club_id
  WHERE f.id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  v_home_owner := v_fixture.home_owner_id;
  v_away_owner := v_fixture.away_owner_id;

  -- Create live match
  INSERT INTO fm_live_matches (fixture_id, status, current_minute, home_score, away_score)
  VALUES (p_fixture_id, 'live', 0, 0, 0)
  RETURNING id INTO v_live_match_id;

  -- Update fixture status
  UPDATE fm_fixtures SET status = 'live' WHERE id = p_fixture_id;

  -- Notify owners (with from_user_id set to the recipient themselves for system notifications)
  IF v_home_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, from_user_id, type, message, related_type, related_id)
    VALUES (v_home_owner, v_home_owner, 'fm_match', '⚽ თქვენი მატჩი დაიწყო! უყურეთ ლაივში', 'fm_live_match', v_live_match_id);
  END IF;
  IF v_away_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, from_user_id, type, message, related_type, related_id)
    VALUES (v_away_owner, v_away_owner, 'fm_match', '⚽ თქვენი მატჩი დაიწყო! უყურეთ ლაივში', 'fm_live_match', v_live_match_id);
  END IF;

  RETURN v_live_match_id;
END;
$$;