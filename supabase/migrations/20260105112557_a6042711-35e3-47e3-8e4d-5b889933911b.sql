-- Create story_reactions table
CREATE TABLE public.story_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT '❤️',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(story_id, user_id)
);

-- Create story_comments table
CREATE TABLE public.story_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  parent_id UUID REFERENCES public.story_comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on story_reactions
ALTER TABLE public.story_reactions ENABLE ROW LEVEL SECURITY;

-- Policies for story_reactions
CREATE POLICY "Anyone can view story reactions"
ON public.story_reactions FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add reactions"
ON public.story_reactions FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.story_reactions FOR DELETE
USING (auth.uid() = user_id);

-- Enable RLS on story_comments
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Policies for story_comments
CREATE POLICY "Anyone can view story comments"
ON public.story_comments FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add comments"
ON public.story_comments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.story_comments FOR DELETE
USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX idx_story_comments_parent_id ON public.story_comments(parent_id);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_comments;