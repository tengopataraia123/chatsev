-- ========================================
-- STORY STICKERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.story_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  sticker_type text NOT NULL,
  position_x real DEFAULT 50,
  position_y real DEFAULT 50,
  scale real DEFAULT 1,
  rotation real DEFAULT 0,
  data jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view stickers" ON public.story_stickers;
CREATE POLICY "Anyone can view stickers" ON public.story_stickers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Owners can manage stickers" ON public.story_stickers;
CREATE POLICY "Owners can manage stickers" ON public.story_stickers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
  );

-- ========================================
-- STORY POLL RESPONSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.story_poll_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  option_index integer NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(sticker_id, user_id)
);

ALTER TABLE public.story_poll_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view poll responses" ON public.story_poll_responses;
CREATE POLICY "Users can view poll responses" ON public.story_poll_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can respond to polls" ON public.story_poll_responses;
CREATE POLICY "Users can respond to polls" ON public.story_poll_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STORY HIGHLIGHTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.story_highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  cover_url text,
  story_ids uuid[] DEFAULT '{}',
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.story_highlights ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view all highlights" ON public.story_highlights;
CREATE POLICY "Users can view all highlights" ON public.story_highlights
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own highlights" ON public.story_highlights;
CREATE POLICY "Users can manage own highlights" ON public.story_highlights
  FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- CLOSE FRIENDS LIST TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.close_friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.close_friends ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own close friends" ON public.close_friends;
CREATE POLICY "Users can view own close friends" ON public.close_friends
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage close friends" ON public.close_friends;
CREATE POLICY "Users can manage close friends" ON public.close_friends
  FOR ALL USING (auth.uid() = user_id);

-- ========================================
-- STORY QUESTION ANSWERS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.story_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  answer_text text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.story_question_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Story owners can view answers" ON public.story_question_answers;
CREATE POLICY "Story owners can view answers" ON public.story_question_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.story_stickers ss
      JOIN public.stories s ON s.id = ss.story_id
      WHERE ss.id = sticker_id AND s.user_id = auth.uid()
    ) OR auth.uid() = user_id
  );

DROP POLICY IF EXISTS "Users can submit answers" ON public.story_question_answers;
CREATE POLICY "Users can submit answers" ON public.story_question_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STORY SLIDER RESPONSES TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.story_slider_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sticker_id uuid NOT NULL REFERENCES public.story_stickers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  value real NOT NULL CHECK (value >= 0 AND value <= 100),
  created_at timestamptz DEFAULT now(),
  UNIQUE(sticker_id, user_id)
);

ALTER TABLE public.story_slider_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view slider responses" ON public.story_slider_responses;
CREATE POLICY "Users can view slider responses" ON public.story_slider_responses
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can respond to sliders" ON public.story_slider_responses;
CREATE POLICY "Users can respond to sliders" ON public.story_slider_responses
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ========================================
-- STORY SCREENSHOTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.story_screenshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.story_screenshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Story owners can view screenshots" ON public.story_screenshots;
CREATE POLICY "Story owners can view screenshots" ON public.story_screenshots
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.stories WHERE id = story_id AND user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can report screenshots" ON public.story_screenshots;
CREATE POLICY "Users can report screenshots" ON public.story_screenshots
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policy for stories
DROP POLICY IF EXISTS "Admins can manage all stories" ON public.stories;
CREATE POLICY "Admins can manage all stories" ON public.stories
  FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));