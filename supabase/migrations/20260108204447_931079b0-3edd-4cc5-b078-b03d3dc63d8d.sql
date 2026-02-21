-- Fix the trigger function - remove context_id since it's not available in BEFORE INSERT
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
  sender_user_id UUID;
  target_user_id UUID := NULL;
BEGIN
  -- Skip if content is null or empty
  IF NEW.content IS NULL OR trim(NEW.content) = '' THEN
    RETURN NEW;
  END IF;
  
  original_content := NEW.content;
  filtered_content := NEW.content;
  
  -- Determine sender based on table
  IF TG_TABLE_NAME = 'private_messages' THEN
    sender_user_id := NEW.sender_id;
    -- Try to get target user from conversation
    SELECT CASE 
      WHEN c.user1_id = NEW.sender_id THEN c.user2_id 
      ELSE c.user1_id 
    END INTO target_user_id
    FROM public.conversations c
    WHERE c.id = NEW.conversation_id;
  ELSE
    sender_user_id := NEW.user_id;
  END IF;
  
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
      target_user_id,
      original_text, 
      filtered_text, 
      detected_domain, 
      context_type
    ) VALUES (
      sender_user_id,
      target_user_id,
      original_content,
      filtered_content,
      detected_domain,
      TG_TABLE_NAME
    );
    
    NEW.content := filtered_content;
  END IF;
  
  RETURN NEW;
END;
$$;