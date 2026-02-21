
-- Create function to send welcome message to new users
CREATE OR REPLACE FUNCTION public.send_welcome_message_to_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  welcome_broadcast_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Insert welcome message for the new user
  INSERT INTO public.system_broadcast_recipients (
    broadcast_id,
    user_id,
    delivery_status,
    delivered_at,
    seen_at,
    created_at
  ) VALUES (
    welcome_broadcast_id,
    NEW.user_id,
    'sent',
    now(),
    NULL,
    now()
  )
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$function$;

-- Create trigger on profiles table for new user registration
DROP TRIGGER IF EXISTS trigger_send_welcome_message ON public.profiles;

CREATE TRIGGER trigger_send_welcome_message
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message_to_new_user();
