-- Create blocked_words table for word filtering
CREATE TABLE public.blocked_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  word TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;

-- Admin can manage blocked words
CREATE POLICY "Admins can manage blocked words"
ON public.blocked_words
FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Everyone can read blocked words for filtering
CREATE POLICY "Everyone can read blocked words"
ON public.blocked_words
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_blocked_words_updated_at
BEFORE UPDATE ON public.blocked_words
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create database function to filter words
CREATE OR REPLACE FUNCTION public.filter_blocked_words()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  blocked_word RECORD;
  filtered_content TEXT;
  word_pattern TEXT;
BEGIN
  -- Skip if content is null or empty
  IF NEW.content IS NULL OR trim(NEW.content) = '' THEN
    RETURN NEW;
  END IF;
  
  filtered_content := NEW.content;
  
  -- Check each blocked word
  FOR blocked_word IN 
    SELECT word FROM public.blocked_words WHERE is_active = true
  LOOP
    -- Create case-insensitive word boundary pattern
    word_pattern := '\m' || regexp_replace(blocked_word.word, '([.+*?^${}()|[\]\\])', '\\\1', 'g') || '\M';
    
    -- Replace with asterisks (same length as word)
    filtered_content := regexp_replace(
      filtered_content, 
      word_pattern, 
      repeat('*', length(blocked_word.word)), 
      'gi'
    );
  END LOOP;
  
  NEW.content := filtered_content;
  RETURN NEW;
END;
$function$;

-- Add triggers to filter words in messages
CREATE TRIGGER filter_words_private_messages
BEFORE INSERT OR UPDATE ON public.private_messages
FOR EACH ROW
EXECUTE FUNCTION public.filter_blocked_words();

CREATE TRIGGER filter_words_group_messages
BEFORE INSERT OR UPDATE ON public.group_chat_messages
FOR EACH ROW
EXECUTE FUNCTION public.filter_blocked_words();

CREATE TRIGGER filter_words_post_comments
BEFORE INSERT OR UPDATE ON public.post_comments
FOR EACH ROW
EXECUTE FUNCTION public.filter_blocked_words();

CREATE TRIGGER filter_words_posts
BEFORE INSERT OR UPDATE ON public.posts
FOR EACH ROW
EXECUTE FUNCTION public.filter_blocked_words();

CREATE TRIGGER filter_words_live_comments
BEFORE INSERT OR UPDATE ON public.live_comments
FOR EACH ROW
EXECUTE FUNCTION public.filter_blocked_words();