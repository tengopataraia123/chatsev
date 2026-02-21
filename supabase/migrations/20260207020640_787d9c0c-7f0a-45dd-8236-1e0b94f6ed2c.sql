-- AI Avatar Generations table
CREATE TABLE public.ai_avatar_generations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  style TEXT DEFAULT 'anime',
  source_image_url TEXT,
  generated_image_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Anonymous Q&A Questions
CREATE TABLE public.anonymous_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  question TEXT NOT NULL,
  answer TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  is_public BOOLEAN DEFAULT false,
  answered_at TIMESTAMP WITH TIME ZONE,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Anonymous Q&A Likes
CREATE TABLE public.anonymous_question_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.anonymous_questions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(question_id, user_id)
);

-- Mood Journal Entries
CREATE TABLE public.mood_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood_level INTEGER NOT NULL CHECK (mood_level >= 1 AND mood_level <= 5),
  mood_emoji TEXT NOT NULL,
  mood_label TEXT NOT NULL,
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  stress_level INTEGER CHECK (stress_level >= 1 AND stress_level <= 5),
  sleep_hours DECIMAL(3,1),
  notes TEXT,
  activities TEXT[],
  weather TEXT,
  location TEXT,
  is_private BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Mood Streaks
CREATE TABLE public.mood_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_entry_date DATE,
  total_entries INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_avatar_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_question_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_streaks ENABLE ROW LEVEL SECURITY;

-- AI Avatar policies
CREATE POLICY "Users can view own avatars" ON public.ai_avatar_generations
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create avatars" ON public.ai_avatar_generations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Anonymous Q&A policies
CREATE POLICY "Anyone can view public answered questions" ON public.anonymous_questions
  FOR SELECT USING (is_public = true AND answer IS NOT NULL);
CREATE POLICY "Recipients can view all their questions" ON public.anonymous_questions
  FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Senders can view their own questions" ON public.anonymous_questions
  FOR SELECT USING (auth.uid() = sender_id);
CREATE POLICY "Anyone can ask questions" ON public.anonymous_questions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Recipients can answer their questions" ON public.anonymous_questions
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Anonymous Q&A Likes policies
CREATE POLICY "Anyone can view likes" ON public.anonymous_question_likes
  FOR SELECT USING (true);
CREATE POLICY "Users can like" ON public.anonymous_question_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike" ON public.anonymous_question_likes
  FOR DELETE USING (auth.uid() = user_id);

-- Mood Journal policies
CREATE POLICY "Users can view own moods" ON public.mood_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create moods" ON public.mood_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own moods" ON public.mood_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own moods" ON public.mood_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Mood Streaks policies
CREATE POLICY "Users can view own streak" ON public.mood_streaks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can manage own streak" ON public.mood_streaks
  FOR ALL USING (auth.uid() = user_id);

-- Function to update mood streak
CREATE OR REPLACE FUNCTION public.update_mood_streak()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mood_streaks (user_id, current_streak, longest_streak, last_entry_date, total_entries)
  VALUES (NEW.user_id, 1, 1, CURRENT_DATE, 1)
  ON CONFLICT (user_id) DO UPDATE SET
    current_streak = CASE 
      WHEN mood_streaks.last_entry_date = CURRENT_DATE - 1 THEN mood_streaks.current_streak + 1
      WHEN mood_streaks.last_entry_date = CURRENT_DATE THEN mood_streaks.current_streak
      ELSE 1
    END,
    longest_streak = GREATEST(
      mood_streaks.longest_streak,
      CASE 
        WHEN mood_streaks.last_entry_date = CURRENT_DATE - 1 THEN mood_streaks.current_streak + 1
        ELSE 1
      END
    ),
    last_entry_date = CURRENT_DATE,
    total_entries = mood_streaks.total_entries + 1,
    updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mood streak update
CREATE TRIGGER update_mood_streak_trigger
AFTER INSERT ON public.mood_entries
FOR EACH ROW
EXECUTE FUNCTION public.update_mood_streak();