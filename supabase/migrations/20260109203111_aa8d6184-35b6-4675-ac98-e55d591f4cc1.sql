-- Create daily_topics table for group chat
CREATE TABLE IF NOT EXISTS public.group_chat_daily_topics (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    likes_count INTEGER NOT NULL DEFAULT 0,
    dislikes_count INTEGER NOT NULL DEFAULT 0
);

-- Create topic reactions table
CREATE TABLE IF NOT EXISTS public.group_chat_topic_reactions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID NOT NULL REFERENCES public.group_chat_daily_topics(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'dislike')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(topic_id, user_id)
);

-- Enable RLS
ALTER TABLE public.group_chat_daily_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_chat_topic_reactions ENABLE ROW LEVEL SECURITY;

-- RLS policies for daily topics
CREATE POLICY "Everyone can view daily topics" 
ON public.group_chat_daily_topics 
FOR SELECT 
USING (true);

CREATE POLICY "Super admins can insert daily topics" 
ON public.group_chat_daily_topics 
FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

CREATE POLICY "Super admins can update daily topics" 
ON public.group_chat_daily_topics 
FOR UPDATE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

CREATE POLICY "Super admins can delete daily topics" 
ON public.group_chat_daily_topics 
FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- RLS policies for topic reactions
CREATE POLICY "Everyone can view topic reactions" 
ON public.group_chat_topic_reactions 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can react to topics" 
ON public.group_chat_topic_reactions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reactions" 
ON public.group_chat_topic_reactions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions" 
ON public.group_chat_topic_reactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update topic reaction counts
CREATE OR REPLACE FUNCTION public.update_topic_reaction_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE public.group_chat_daily_topics
        SET 
            likes_count = (SELECT COUNT(*) FROM public.group_chat_topic_reactions WHERE topic_id = NEW.topic_id AND reaction_type = 'like'),
            dislikes_count = (SELECT COUNT(*) FROM public.group_chat_topic_reactions WHERE topic_id = NEW.topic_id AND reaction_type = 'dislike'),
            updated_at = now()
        WHERE id = NEW.topic_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.group_chat_daily_topics
        SET 
            likes_count = (SELECT COUNT(*) FROM public.group_chat_topic_reactions WHERE topic_id = OLD.topic_id AND reaction_type = 'like'),
            dislikes_count = (SELECT COUNT(*) FROM public.group_chat_topic_reactions WHERE topic_id = OLD.topic_id AND reaction_type = 'dislike'),
            updated_at = now()
        WHERE id = OLD.topic_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for reaction counts
CREATE TRIGGER update_topic_reactions_count
AFTER INSERT OR UPDATE OR DELETE ON public.group_chat_topic_reactions
FOR EACH ROW
EXECUTE FUNCTION public.update_topic_reaction_counts();