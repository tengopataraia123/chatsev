-- Create function to filter advertising in messages
CREATE OR REPLACE FUNCTION public.filter_advertising_content()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  blocked_domain RECORD;
  filtered_content TEXT;
  domain_pattern TEXT;
  detected_domain TEXT := NULL;
  original_content TEXT;
BEGIN
  -- Skip if content is null or empty
  IF NEW.content IS NULL OR trim(NEW.content) = '' THEN
    RETURN NEW;
  END IF;
  
  original_content := NEW.content;
  filtered_content := NEW.content;
  
  -- Check each blocked domain
  FOR blocked_domain IN 
    SELECT domain FROM public.blocked_domains WHERE is_active = true
  LOOP
    -- Create pattern that matches domain with prefixes/suffixes
    domain_pattern := '(https?://)?(www\.)?' || 
      regexp_replace(blocked_domain.domain, '([.+*?^${}()|[\]\\])', '\\\1', 'g') || 
      '(/[^\s]*)?';
    
    -- Check if pattern exists in content
    IF filtered_content ~* domain_pattern THEN
      detected_domain := blocked_domain.domain;
      -- Replace with snowflakes
      filtered_content := regexp_replace(filtered_content, domain_pattern, '❄❄❄❄❄❄', 'gi');
    END IF;
  END LOOP;
  
  -- If content was filtered, log violation and update content
  IF detected_domain IS NOT NULL THEN
    -- Log the violation
    INSERT INTO public.ad_violations (
      user_id, 
      original_text, 
      filtered_text, 
      detected_domain, 
      context_type,
      context_id
    ) VALUES (
      COALESCE(NEW.sender_id, NEW.user_id),
      original_content,
      filtered_content,
      detected_domain,
      TG_TABLE_NAME,
      NEW.id::text
    );
    
    NEW.content := filtered_content;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add trigger for private_messages
DROP TRIGGER IF EXISTS filter_private_message_ads ON public.private_messages;
CREATE TRIGGER filter_private_message_ads
  BEFORE INSERT ON public.private_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.filter_advertising_content();

-- Add trigger for group_chat_messages
DROP TRIGGER IF EXISTS filter_group_chat_ads ON public.group_chat_messages;
CREATE TRIGGER filter_group_chat_ads
  BEFORE INSERT ON public.group_chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.filter_advertising_content();

-- Add trigger for post_comments
DROP TRIGGER IF EXISTS filter_comment_ads ON public.post_comments;
CREATE TRIGGER filter_comment_ads
  BEFORE INSERT ON public.post_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.filter_advertising_content();