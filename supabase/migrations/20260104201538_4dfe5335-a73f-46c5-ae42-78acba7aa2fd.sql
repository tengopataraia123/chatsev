-- Fix the foreign key relationship for group_chat_messages to join with profiles
-- First, we need to add a proper relationship through user_id

-- Create an index for better performance on message queries
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_user_id ON public.group_chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_group_chat_messages_created_at ON public.group_chat_messages(created_at DESC);

-- Create index on profiles for user_id
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles(user_id);

-- Update the last_seen when user sends a message
CREATE OR REPLACE FUNCTION public.update_last_seen_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET last_seen = now() 
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

-- Create trigger to update last_seen when sending messages
DROP TRIGGER IF EXISTS trigger_update_last_seen ON public.group_chat_messages;
CREATE TRIGGER trigger_update_last_seen
AFTER INSERT ON public.group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_last_seen_on_message();