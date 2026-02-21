-- Add updated_at column to story_reactions if it doesn't exist
ALTER TABLE public.story_reactions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- Add is_deleted column to story_comments if it doesn't exist
ALTER TABLE public.story_comments 
ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Create unique constraint on story_views if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_views_story_id_user_id_key'
  ) THEN
    ALTER TABLE public.story_views ADD CONSTRAINT story_views_story_id_user_id_key UNIQUE (story_id, user_id);
  END IF;
END $$;

-- Create unique constraint on story_reactions if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'story_reactions_story_id_user_id_key'
  ) THEN
    ALTER TABLE public.story_reactions ADD CONSTRAINT story_reactions_story_id_user_id_key UNIQUE (story_id, user_id);
  END IF;
END $$;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_story_views_story_id ON public.story_views(story_id);
CREATE INDEX IF NOT EXISTS idx_story_views_user_id ON public.story_views(user_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_story_id ON public.story_reactions(story_id);
CREATE INDEX IF NOT EXISTS idx_story_reactions_user_id ON public.story_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_story_id ON public.story_comments(story_id);
CREATE INDEX IF NOT EXISTS idx_story_comments_user_id ON public.story_comments(user_id);

-- Trigger function to update story reaction counts
CREATE OR REPLACE FUNCTION public.update_story_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE public.stories 
    SET total_reactions = (
      SELECT COUNT(*) FROM public.story_reactions WHERE story_id = NEW.story_id
    )
    WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories 
    SET total_reactions = (
      SELECT COUNT(*) FROM public.story_reactions WHERE story_id = OLD.story_id
    )
    WHERE id = OLD.story_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_story_reaction_counts ON public.story_reactions;
CREATE TRIGGER trigger_update_story_reaction_counts
AFTER INSERT OR UPDATE OR DELETE ON public.story_reactions
FOR EACH ROW EXECUTE FUNCTION public.update_story_reaction_counts();

-- Trigger function to update story comment counts
CREATE OR REPLACE FUNCTION public.update_story_comment_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories 
    SET total_replies = (
      SELECT COUNT(*) FROM public.story_comments WHERE story_id = NEW.story_id AND is_deleted = false
    )
    WHERE id = NEW.story_id;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    UPDATE public.stories 
    SET total_replies = (
      SELECT COUNT(*) FROM public.story_comments WHERE story_id = COALESCE(NEW.story_id, OLD.story_id) AND is_deleted = false
    )
    WHERE id = COALESCE(NEW.story_id, OLD.story_id);
    RETURN COALESCE(NEW, OLD);
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS trigger_update_story_comment_counts ON public.story_comments;
CREATE TRIGGER trigger_update_story_comment_counts
AFTER INSERT OR UPDATE OR DELETE ON public.story_comments
FOR EACH ROW EXECUTE FUNCTION public.update_story_comment_counts();

-- Add total_comments column if not exists (using total_replies for now)
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS total_comments INTEGER DEFAULT 0;

-- RLS policies for story_comments
ALTER TABLE public.story_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate
DROP POLICY IF EXISTS "Anyone can view non-deleted story comments" ON public.story_comments;
DROP POLICY IF EXISTS "Authenticated users can create story comments" ON public.story_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.story_comments;
DROP POLICY IF EXISTS "Story owners and comment authors can delete" ON public.story_comments;

-- View policy
CREATE POLICY "Anyone can view non-deleted story comments"
ON public.story_comments FOR SELECT
TO authenticated
USING (is_deleted = false OR user_id = auth.uid());

-- Insert policy
CREATE POLICY "Authenticated users can create story comments"
ON public.story_comments FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Update policy (for soft delete)
CREATE POLICY "Users can update their own comments"
ON public.story_comments FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'super_admin'));

-- Delete policy
CREATE POLICY "Story owners and admins can delete comments"
ON public.story_comments FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() 
  OR public.has_role(auth.uid(), 'super_admin')
  OR EXISTS (
    SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid()
  )
);