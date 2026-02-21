
-- Create function to clear all messages in a conversation for the current user
-- This marks messages as deleted for the user rather than physically deleting them
CREATE OR REPLACE FUNCTION public.clear_conversation_messages(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_user1 boolean;
  v_is_user2 boolean;
BEGIN
  -- Check if user is part of the conversation
  SELECT 
    user1_id = v_user_id,
    user2_id = v_user_id
  INTO v_is_user1, v_is_user2
  FROM conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND OR (NOT v_is_user1 AND NOT v_is_user2) THEN
    RAISE EXCEPTION 'Access denied - not a participant of this conversation';
  END IF;

  -- Mark all messages as deleted for this user
  IF v_is_user1 OR v_is_user2 THEN
    -- For messages the user sent, mark deleted_for_sender
    UPDATE private_messages
    SET deleted_for_sender = true
    WHERE conversation_id = p_conversation_id
      AND sender_id = v_user_id;

    -- For messages the user received, mark deleted_for_receiver
    UPDATE private_messages
    SET deleted_for_receiver = true
    WHERE conversation_id = p_conversation_id
      AND sender_id != v_user_id;
  END IF;
END;
$$;

-- Create function to delete a conversation for the current user
-- This uses soft-delete via conversation_user_state
CREATE OR REPLACE FUNCTION public.delete_conversation_for_user(p_conversation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_participant boolean;
BEGIN
  -- Check if user is part of the conversation
  SELECT (user1_id = v_user_id OR user2_id = v_user_id)
  INTO v_is_participant
  FROM conversations
  WHERE id = p_conversation_id;

  IF NOT FOUND OR NOT v_is_participant THEN
    RAISE EXCEPTION 'Access denied - not a participant of this conversation';
  END IF;

  -- First clear all messages for this user
  PERFORM clear_conversation_messages(p_conversation_id);

  -- Mark the conversation as deleted for this user
  INSERT INTO conversation_user_state (conversation_id, user_id, is_deleted, deleted_at)
  VALUES (p_conversation_id, v_user_id, true, now())
  ON CONFLICT (conversation_id, user_id) 
  DO UPDATE SET is_deleted = true, deleted_at = now(), updated_at = now();
END;
$$;

-- Create function to delete all conversations for the current user
CREATE OR REPLACE FUNCTION public.delete_all_conversations_for_user()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_count integer := 0;
  v_conv_id uuid;
BEGIN
  -- Loop through all conversations where user is a participant
  FOR v_conv_id IN
    SELECT id FROM conversations
    WHERE user1_id = v_user_id OR user2_id = v_user_id
  LOOP
    PERFORM delete_conversation_for_user(v_conv_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.clear_conversation_messages(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_conversation_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_all_conversations_for_user() TO authenticated;
