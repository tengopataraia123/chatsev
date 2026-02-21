-- Create comments table for daily topics
CREATE TABLE public.group_chat_topic_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  topic_id UUID NOT NULL REFERENCES public.group_chat_daily_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_chat_topic_comments ENABLE ROW LEVEL SECURITY;

-- RLS policies for topic comments
CREATE POLICY "Anyone can view topic comments"
ON public.group_chat_topic_comments
FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create topic comments"
ON public.group_chat_topic_comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.group_chat_topic_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Update reaction_type column to support more reaction types
ALTER TABLE public.group_chat_topic_reactions 
ALTER COLUMN reaction_type TYPE TEXT;

-- Enable realtime for topic comments
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_chat_topic_comments;