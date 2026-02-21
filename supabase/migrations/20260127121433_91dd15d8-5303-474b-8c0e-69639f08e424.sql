-- =============================================
-- GAMIFICATION SYSTEM - Add missing tables
-- =============================================

-- User points and levels table
CREATE TABLE IF NOT EXISTS public.user_gamification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  current_level INTEGER NOT NULL DEFAULT 1,
  experience_points INTEGER NOT NULL DEFAULT 0,
  streak_days INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  posts_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  likes_given INTEGER NOT NULL DEFAULT 0,
  likes_received INTEGER NOT NULL DEFAULT 0,
  friends_count INTEGER NOT NULL DEFAULT 0,
  stories_count INTEGER NOT NULL DEFAULT 0,
  quiz_wins INTEGER NOT NULL DEFAULT 0,
  games_played INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Points history/transactions
CREATE TABLE IF NOT EXISTS public.points_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  points INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  description TEXT,
  reference_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leaderboard cache
CREATE TABLE IF NOT EXISTS public.leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  period TEXT NOT NULL,
  rank INTEGER NOT NULL,
  points INTEGER NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, period)
);

-- Enable RLS
ALTER TABLE public.user_gamification ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view all gamification stats" ON public.user_gamification;
DROP POLICY IF EXISTS "Users can update own gamification" ON public.user_gamification;
DROP POLICY IF EXISTS "System can insert gamification" ON public.user_gamification;
DROP POLICY IF EXISTS "Users can view own points history" ON public.points_history;
DROP POLICY IF EXISTS "System can insert points" ON public.points_history;
DROP POLICY IF EXISTS "Anyone can view leaderboard" ON public.leaderboard_cache;

-- RLS Policies for user_gamification
CREATE POLICY "Users can view all gamification stats"
  ON public.user_gamification FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own gamification"
  ON public.user_gamification FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert gamification"
  ON public.user_gamification FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for points_history
CREATE POLICY "Users can view own points history"
  ON public.points_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert points"
  ON public.points_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for leaderboard
CREATE POLICY "Anyone can view leaderboard"
  ON public.leaderboard_cache FOR SELECT
  TO authenticated
  USING (true);

-- Function to award points
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total INTEGER;
  v_new_level INTEGER;
  v_current_level INTEGER;
BEGIN
  INSERT INTO public.user_gamification (user_id, total_points, experience_points)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_gamification.total_points + p_points,
    experience_points = user_gamification.experience_points + p_points,
    updated_at = now()
  RETURNING total_points, current_level INTO v_new_total, v_current_level;
  
  v_new_level := GREATEST(1, (v_new_total / 1000) + 1);
  
  IF v_new_level > v_current_level THEN
    UPDATE public.user_gamification SET current_level = v_new_level WHERE user_id = p_user_id;
  END IF;
  
  INSERT INTO public.points_history (user_id, points, action_type, description, reference_id)
  VALUES (p_user_id, p_points, p_action_type, p_description, p_reference_id);
  
  RETURN v_new_total;
END;
$$;

-- Function to update streak
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_today DATE := CURRENT_DATE;
BEGIN
  SELECT last_activity_date, streak_days INTO v_last_date, v_current_streak
  FROM public.user_gamification WHERE user_id = p_user_id;
  
  IF v_last_date IS NULL THEN
    INSERT INTO public.user_gamification (user_id, streak_days, last_activity_date)
    VALUES (p_user_id, 1, v_today)
    ON CONFLICT (user_id) DO UPDATE SET streak_days = 1, last_activity_date = v_today;
    RETURN 1;
  ELSIF v_last_date = v_today THEN
    RETURN v_current_streak;
  ELSIF v_last_date = v_today - 1 THEN
    UPDATE public.user_gamification SET streak_days = streak_days + 1, last_activity_date = v_today WHERE user_id = p_user_id;
    RETURN v_current_streak + 1;
  ELSE
    UPDATE public.user_gamification SET streak_days = 1, last_activity_date = v_today WHERE user_id = p_user_id;
    RETURN 1;
  END IF;
END;
$$;

-- Insert default badges if not exist
INSERT INTO public.badges (name, display_name, description, icon, color, category, points_required, sort_order) VALUES
('newcomer', 'ახალბედა', 'დარეგისტრირდა საიტზე', 'UserPlus', '#10B981', 'membership', 0, 1),
('first_post', 'პირველი პოსტი', 'გამოაქვეყნა პირველი პოსტი', 'FileText', '#3B82F6', 'content', 10, 2),
('social_butterfly', 'სოციალური პეპელა', 'დაამატა 10 მეგობარი', 'Users', '#EC4899', 'social', 100, 3),
('popular', 'პოპულარული', 'მიიღო 100 მოწონება', 'Heart', '#EF4444', 'engagement', 200, 4),
('content_creator', 'კონტენტ-მეიკერი', 'გამოაქვეყნა 50 პოსტი', 'Camera', '#8B5CF6', 'content', 500, 5),
('veteran', 'ვეტერანი', 'აქტიურია 30 დღე', 'Award', '#F59E0B', 'membership', 300, 6),
('influencer', 'ინფლუენსერი', 'მიიღო 1000 მოწონება', 'Star', '#FFD700', 'engagement', 2000, 7),
('champion', 'ჩემპიონი', 'დააგროვა 5000 ქულა', 'Trophy', '#FFD700', 'achievement', 5000, 8),
('legend', 'ლეგენდა', 'დააგროვა 10000 ქულა', 'Crown', '#9333EA', 'achievement', 10000, 9)
ON CONFLICT (name) DO NOTHING;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_gamification_points ON public.user_gamification(total_points DESC);
CREATE INDEX IF NOT EXISTS idx_user_gamification_level ON public.user_gamification(current_level DESC);
CREATE INDEX IF NOT EXISTS idx_points_history_user ON public.points_history(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leaderboard_period_rank ON public.leaderboard_cache(period, rank);