-- Create table for comment likes
CREATE TABLE public.comment_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  comment_id UUID NOT NULL REFERENCES public.post_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(comment_id, user_id)
);

-- Create table for reply likes
CREATE TABLE public.reply_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reply_id UUID NOT NULL REFERENCES public.comment_replies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(reply_id, user_id)
);

-- Enable RLS
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reply_likes ENABLE ROW LEVEL SECURITY;

-- Policies for comment_likes
CREATE POLICY "Anyone can view comment likes" ON public.comment_likes FOR SELECT USING (true);
CREATE POLICY "Users can like comments" ON public.comment_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike comments" ON public.comment_likes FOR DELETE USING (auth.uid() = user_id);

-- Policies for reply_likes
CREATE POLICY "Anyone can view reply likes" ON public.reply_likes FOR SELECT USING (true);
CREATE POLICY "Users can like replies" ON public.reply_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike replies" ON public.reply_likes FOR DELETE USING (auth.uid() = user_id);