-- 1. INPUT VALIDATION: Add length constraints to text columns
-- Using triggers instead of CHECK constraints for better flexibility

-- Create validation trigger function for posts
CREATE OR REPLACE FUNCTION public.validate_post_content()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NOT NULL AND length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Post content exceeds maximum length of 5000 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_post_content_trigger
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_post_content();

-- Create validation trigger function for comments
CREATE OR REPLACE FUNCTION public.validate_comment_content()
RETURNS TRIGGER AS $$
BEGIN
  IF length(NEW.content) = 0 THEN
    RAISE EXCEPTION 'Comment content cannot be empty';
  END IF;
  IF length(NEW.content) > 2000 THEN
    RAISE EXCEPTION 'Comment content exceeds maximum length of 2000 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_comment_content_trigger
  BEFORE INSERT OR UPDATE ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_comment_content();

-- Create validation trigger function for private messages
CREATE OR REPLACE FUNCTION public.validate_private_message()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content IS NOT NULL AND length(NEW.content) > 5000 THEN
    RAISE EXCEPTION 'Message content exceeds maximum length of 5000 characters';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_private_message_trigger
  BEFORE INSERT OR UPDATE ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_private_message();

-- 2. PROFILES: Restrict public access - only authenticated users can view profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Authenticated users can view profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow public read only for basic info (via a more restricted approach)
-- Unauthenticated users cannot see any profiles now

-- 3. CONVERSATIONS: Fix policy to ensure both users are correctly validated
-- The existing policy already checks (auth.uid() = user1_id OR auth.uid() = user2_id)
-- But we need to ensure the INSERT also validates that user creates conversation with themselves as participant

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations with themselves as participant"
  ON public.conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user1_id OR auth.uid() = user2_id
  );

-- Add validation trigger to prevent creating conversations where user is not a participant
CREATE OR REPLACE FUNCTION public.validate_conversation_participants()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the creating user is one of the participants
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  IF auth.uid() != NEW.user1_id AND auth.uid() != NEW.user2_id THEN
    RAISE EXCEPTION 'You must be a participant in the conversation';
  END IF;
  
  -- Prevent duplicate conversations (order users consistently)
  IF NEW.user1_id > NEW.user2_id THEN
    -- Swap to ensure consistent ordering
    DECLARE temp_id UUID;
    BEGIN
      temp_id := NEW.user1_id;
      NEW.user1_id := NEW.user2_id;
      NEW.user2_id := temp_id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER validate_conversation_trigger
  BEFORE INSERT ON public.conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_conversation_participants();