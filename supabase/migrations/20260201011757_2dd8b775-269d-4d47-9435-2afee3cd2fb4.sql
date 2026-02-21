
-- Story Mutes - users can mute other users' stories
CREATE TABLE IF NOT EXISTS public.story_mutes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  muted_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, muted_user_id)
);

-- Story Hidden - users can hide specific stories
CREATE TABLE IF NOT EXISTS public.story_hidden (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  hidden_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, hidden_user_id)
);

-- Story Analytics - detailed view tracking
CREATE TABLE IF NOT EXISTS public.story_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL,
  watch_time_seconds INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(story_id, viewer_id)
);

-- Add columns to stories table for enhanced features
ALTER TABLE public.stories 
ADD COLUMN IF NOT EXISTS story_type TEXT DEFAULT 'photo' CHECK (story_type IN ('photo', 'video', 'text')),
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 30,
ADD COLUMN IF NOT EXISTS text_content JSONB,
ADD COLUMN IF NOT EXISTS background_style TEXT,
ADD COLUMN IF NOT EXISTS font_style TEXT DEFAULT 'bold',
ADD COLUMN IF NOT EXISTS is_highlighted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS highlighted_by UUID,
ADD COLUMN IF NOT EXISTS highlighted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS unique_views INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reactions INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_replies INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS avg_watch_time FLOAT DEFAULT 0,
ADD COLUMN IF NOT EXISTS completion_rate FLOAT DEFAULT 0;

-- Story Replies (DM integration)
CREATE TABLE IF NOT EXISTS public.story_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id UUID NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT,
  gif_id UUID REFERENCES public.gifs(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.story_mutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_hidden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_replies ENABLE ROW LEVEL SECURITY;

-- RLS Policies for story_mutes
CREATE POLICY "Users can view own mutes" ON public.story_mutes
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own mutes" ON public.story_mutes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own mutes" ON public.story_mutes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for story_hidden
CREATE POLICY "Users can view own hidden" ON public.story_hidden
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own hidden" ON public.story_hidden
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own hidden" ON public.story_hidden
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for story_analytics
CREATE POLICY "Users can view analytics for own stories" ON public.story_analytics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );
  
CREATE POLICY "Users can insert analytics" ON public.story_analytics
  FOR INSERT WITH CHECK (auth.uid() = viewer_id);
  
CREATE POLICY "Users can update own analytics" ON public.story_analytics
  FOR UPDATE USING (auth.uid() = viewer_id);

-- RLS Policies for story_replies
CREATE POLICY "Users can view relevant replies" ON public.story_replies
  FOR SELECT USING (
    auth.uid() = sender_id 
    OR EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
  );
  
CREATE POLICY "Users can insert replies" ON public.story_replies
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
  
CREATE POLICY "Users can delete own replies" ON public.story_replies
  FOR DELETE USING (auth.uid() = sender_id);

-- Function to update story analytics on view
CREATE OR REPLACE FUNCTION public.update_story_analytics()
RETURNS TRIGGER AS $$
BEGIN
  -- Update story totals
  UPDATE public.stories
  SET 
    total_views = (SELECT COUNT(*) FROM public.story_analytics WHERE story_id = NEW.story_id),
    unique_views = (SELECT COUNT(DISTINCT viewer_id) FROM public.story_analytics WHERE story_id = NEW.story_id),
    avg_watch_time = COALESCE((SELECT AVG(watch_time_seconds) FROM public.story_analytics WHERE story_id = NEW.story_id), 0),
    completion_rate = COALESCE((SELECT (COUNT(*) FILTER (WHERE completed = true)::FLOAT / NULLIF(COUNT(*), 0) * 100) FROM public.story_analytics WHERE story_id = NEW.story_id), 0)
  WHERE id = NEW.story_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for analytics updates
DROP TRIGGER IF EXISTS story_analytics_update_trigger ON public.story_analytics;
CREATE TRIGGER story_analytics_update_trigger
  AFTER INSERT OR UPDATE ON public.story_analytics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_story_analytics();

-- Function to update reaction count
CREATE OR REPLACE FUNCTION public.update_story_reaction_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET total_reactions = total_reactions + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET total_reactions = GREATEST(0, total_reactions - 1) WHERE id = OLD.story_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for reaction count
DROP TRIGGER IF EXISTS story_reaction_count_trigger ON public.story_reactions;
CREATE TRIGGER story_reaction_count_trigger
  AFTER INSERT OR DELETE ON public.story_reactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_story_reaction_count();

-- Function to update reply count
CREATE OR REPLACE FUNCTION public.update_story_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.stories SET total_replies = total_replies + 1 WHERE id = NEW.story_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.stories SET total_replies = GREATEST(0, total_replies - 1) WHERE id = OLD.story_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for reply count
DROP TRIGGER IF EXISTS story_reply_count_trigger ON public.story_replies;
CREATE TRIGGER story_reply_count_trigger
  AFTER INSERT OR DELETE ON public.story_replies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_story_reply_count();

-- Enable realtime for story tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_analytics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.story_replies;
