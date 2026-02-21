-- =====================================================
-- QUIZ SYSTEM - Complete Facebook-level Architecture
-- =====================================================

-- 1) Quizzes table - upgrade existing
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS context_type text DEFAULT 'feed';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS context_id uuid;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS total_points integer DEFAULT 0;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS participants_count integer DEFAULT 0;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'everyone';
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS allow_retry boolean DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS show_answers_after boolean DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS randomize_questions boolean DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS randomize_answers boolean DEFAULT false;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS allow_comments boolean DEFAULT true;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.quizzes ADD COLUMN IF NOT EXISTS is_closed boolean DEFAULT false;

-- 2) Quiz questions table - upgrade existing or create
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_questions' AND column_name = 'image_url') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN image_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_questions' AND column_name = 'gif_url') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN gif_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_questions' AND column_name = 'points') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN points integer DEFAULT 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_questions' AND column_name = 'time_limit') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN time_limit integer;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'quiz_questions' AND column_name = 'explanation') THEN
    ALTER TABLE public.quiz_questions ADD COLUMN explanation text;
  END IF;
END $$;

-- 3) Quiz answers table (separate from options)
CREATE TABLE IF NOT EXISTS public.quiz_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  text text NOT NULL,
  image_url text,
  is_correct boolean DEFAULT false,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 4) Quiz attempts table
CREATE TABLE IF NOT EXISTS public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  score integer DEFAULT 0,
  total_points integer DEFAULT 0,
  percentage numeric(5,2) DEFAULT 0,
  started_at timestamptz DEFAULT now(),
  finished_at timestamptz,
  time_taken_seconds integer,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- 5) Quiz attempt answers (detailed answer tracking)
CREATE TABLE IF NOT EXISTS public.quiz_attempt_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id uuid REFERENCES public.quiz_attempts(id) ON DELETE CASCADE NOT NULL,
  question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  answer_id uuid REFERENCES public.quiz_answers(id) ON DELETE SET NULL,
  is_correct boolean DEFAULT false,
  time_taken_seconds integer,
  created_at timestamptz DEFAULT now()
);

-- 6) Quiz moderation table
CREATE TABLE IF NOT EXISTS public.quiz_moderation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  admin_id uuid NOT NULL,
  action text NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);

-- 7) Quiz comments table
CREATE TABLE IF NOT EXISTS public.quiz_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  parent_id uuid REFERENCES public.quiz_comments(id) ON DELETE CASCADE,
  gif_id uuid REFERENCES public.gifs(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- 8) Quiz reactions table
CREATE TABLE IF NOT EXISTS public.quiz_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL DEFAULT 'like',
  created_at timestamptz DEFAULT now(),
  UNIQUE(quiz_id, user_id)
);

-- 9) Quiz shares table
CREATE TABLE IF NOT EXISTS public.quiz_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  share_type text DEFAULT 'feed',
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- BADGE / REWARD SYSTEM
-- =====================================================

-- 10) Badges definition table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award',
  color text DEFAULT 'gold',
  category text DEFAULT 'general',
  points_required integer DEFAULT 0,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- 11) User badges (earned badges)
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_id uuid REFERENCES public.badges(id) ON DELETE CASCADE NOT NULL,
  earned_at timestamptz DEFAULT now(),
  is_displayed boolean DEFAULT true,
  UNIQUE(user_id, badge_id)
);

-- 12) User points / wallet
CREATE TABLE IF NOT EXISTS public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  level integer DEFAULT 1,
  xp integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- 13) Points transactions log
CREATE TABLE IF NOT EXISTS public.points_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  transaction_type text NOT NULL,
  source_type text,
  source_id uuid,
  description text,
  created_at timestamptz DEFAULT now()
);

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Enable RLS
ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempt_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;

-- Quiz answers policies
CREATE POLICY "Quiz answers are viewable by everyone" ON public.quiz_answers FOR SELECT USING (true);
CREATE POLICY "Quiz answers are insertable by quiz owner" ON public.quiz_answers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Quiz answers are updatable by quiz owner" ON public.quiz_answers FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "Quiz answers are deletable by quiz owner" ON public.quiz_answers FOR DELETE USING (auth.uid() IS NOT NULL);

-- Quiz attempts policies
CREATE POLICY "Quiz attempts are viewable by owner" ON public.quiz_attempts FOR SELECT USING (auth.uid() = user_id OR auth.uid() IN (SELECT user_id FROM quizzes WHERE id = quiz_id));
CREATE POLICY "Users can create their own attempts" ON public.quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own attempts" ON public.quiz_attempts FOR UPDATE USING (auth.uid() = user_id);

-- Quiz attempt answers policies
CREATE POLICY "Attempt answers viewable by attempt owner" ON public.quiz_attempt_answers FOR SELECT USING (auth.uid() IN (SELECT user_id FROM quiz_attempts WHERE id = attempt_id));
CREATE POLICY "Users can insert their attempt answers" ON public.quiz_attempt_answers FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM quiz_attempts WHERE id = attempt_id));

-- Quiz moderation policies
CREATE POLICY "Quiz moderation viewable by admins" ON public.quiz_moderation FOR SELECT USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin', 'admin', 'moderator')));
CREATE POLICY "Quiz moderation insertable by admins" ON public.quiz_moderation FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin', 'admin', 'moderator')));

-- Quiz comments policies
CREATE POLICY "Quiz comments are viewable by everyone" ON public.quiz_comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments" ON public.quiz_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments" ON public.quiz_comments FOR DELETE USING (auth.uid() = user_id);

-- Quiz reactions policies
CREATE POLICY "Quiz reactions are viewable by everyone" ON public.quiz_reactions FOR SELECT USING (true);
CREATE POLICY "Users can manage their own reactions" ON public.quiz_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reactions" ON public.quiz_reactions FOR DELETE USING (auth.uid() = user_id);

-- Quiz shares policies
CREATE POLICY "Quiz shares are viewable by everyone" ON public.quiz_shares FOR SELECT USING (true);
CREATE POLICY "Users can create shares" ON public.quiz_shares FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badges policies
CREATE POLICY "Badges are viewable by everyone" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Badges are manageable by admins" ON public.badges FOR ALL USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin', 'admin')));

-- User badges policies
CREATE POLICY "User badges are viewable by everyone" ON public.user_badges FOR SELECT USING (true);
CREATE POLICY "User badges are manageable by system" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- User points policies
CREATE POLICY "Users can view their own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their points record" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own points" ON public.user_points FOR UPDATE USING (auth.uid() = user_id);

-- Points transactions policies
CREATE POLICY "Users can view their own transactions" ON public.points_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "System can insert transactions" ON public.points_transactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- =====================================================
-- Insert default badges
-- =====================================================
INSERT INTO public.badges (name, display_name, description, icon, color, category, points_required, sort_order) VALUES
('quiz_master', 'ვიქტორინის ოსტატი', '10 ვიქტორინა დაასრულა 80%+ შედეგით', 'brain', 'gold', 'quiz', 1000, 1),
('perfect_score', 'სრულყოფილი', 'ვიქტორინა 100% სიზუსტით დაასრულა', 'star', 'purple', 'quiz', 500, 2),
('quiz_creator', 'კითხვების ავტორი', '5+ ვიქტორინა შექმნა', 'edit', 'blue', 'quiz', 300, 3),
('poll_voter', 'აქტიური ამომრჩეველი', '50+ გამოკითხვაში მონაწილეობა', 'vote', 'green', 'poll', 200, 4),
('daily_active', 'ყოველდღიური', '7 დღე ზედიზედ აქტიური', 'calendar', 'orange', 'activity', 100, 5),
('top_player', 'TOP მოთამაშე', 'ლიდერბორდზე TOP 10 მოხვდა', 'trophy', 'gold', 'game', 1000, 6),
('bronze_level', 'ბრინჯაოს დონე', 'მიაღწია 500 ქულას', 'medal', 'bronze', 'level', 500, 7),
('silver_level', 'ვერცხლის დონე', 'მიაღწია 2000 ქულას', 'medal', 'silver', 'level', 2000, 8),
('gold_level', 'ოქროს დონე', 'მიაღწია 5000 ქულას', 'medal', 'gold', 'level', 5000, 9)
ON CONFLICT (name) DO NOTHING;

-- Enable realtime for quiz attempts (for leaderboard)
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_attempts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points;