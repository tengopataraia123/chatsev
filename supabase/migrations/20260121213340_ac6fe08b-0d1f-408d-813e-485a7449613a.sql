
-- =============================================
-- "რა? სად? როდის?" GAME MODULE - ISOLATED TABLES
-- =============================================

-- Questions bank for WWW game (completely separate from quiz_v2)
CREATE TABLE public.www_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language VARCHAR(5) NOT NULL DEFAULT 'ka',
  category VARCHAR(100) NOT NULL,
  difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_text TEXT NOT NULL,
  correct_answers TEXT[] NOT NULL, -- Array of acceptable answers
  synonyms TEXT[] DEFAULT '{}', -- Additional synonyms
  allow_partial_match BOOLEAN DEFAULT false,
  related_wrong_pool TEXT[] DEFAULT '{}', -- For bot wrong answers
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Bot profiles
CREATE TABLE public.www_bot_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_id VARCHAR(50) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  avatar_key VARCHAR(50) NOT NULL,
  profile_type VARCHAR(20) NOT NULL CHECK (profile_type IN ('beginner', 'average', 'expert', 'gambler', 'analyst')),
  accuracy_easy_min INTEGER DEFAULT 30,
  accuracy_easy_max INTEGER DEFAULT 60,
  accuracy_medium_min INTEGER DEFAULT 20,
  accuracy_medium_max INTEGER DEFAULT 45,
  accuracy_hard_min INTEGER DEFAULT 10,
  accuracy_hard_max INTEGER DEFAULT 30,
  response_time_min INTEGER DEFAULT 8, -- seconds
  response_time_max INTEGER DEFAULT 45,
  timeout_chance INTEGER DEFAULT 10, -- percentage
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Game sessions
CREATE TABLE public.www_game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('single', 'multiplayer_random', 'multiplayer_invite')),
  status VARCHAR(20) NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  host_user_id UUID NOT NULL,
  current_round INTEGER DEFAULT 0,
  total_rounds INTEGER DEFAULT 10,
  current_question_id UUID REFERENCES public.www_questions(id),
  round_started_at TIMESTAMPTZ,
  language VARCHAR(5) DEFAULT 'ka',
  invite_code VARCHAR(20),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  winner_id UUID
);

-- Game participants (players + bots in a session)
CREATE TABLE public.www_game_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.www_game_sessions(id) ON DELETE CASCADE,
  user_id UUID, -- NULL if bot
  bot_profile_id UUID REFERENCES public.www_bot_profiles(id),
  is_bot BOOLEAN DEFAULT false,
  current_score INTEGER DEFAULT 0,
  correct_answers INTEGER DEFAULT 0,
  wrong_answers INTEGER DEFAULT 0,
  joined_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT participant_type CHECK (
    (is_bot = true AND bot_profile_id IS NOT NULL AND user_id IS NULL) OR
    (is_bot = false AND user_id IS NOT NULL AND bot_profile_id IS NULL)
  )
);

-- Round answers
CREATE TABLE public.www_round_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.www_game_sessions(id) ON DELETE CASCADE,
  participant_id UUID NOT NULL REFERENCES public.www_game_participants(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.www_questions(id),
  round_number INTEGER NOT NULL,
  answer_text TEXT,
  is_correct BOOLEAN,
  matched_variant TEXT, -- Which correct answer variant matched
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMPTZ,
  response_time_ms INTEGER, -- How fast they answered
  is_timeout BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User stats for WWW game (separate from quiz_v2)
CREATE TABLE public.www_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_games INTEGER DEFAULT 0,
  games_won INTEGER DEFAULT 0,
  total_points INTEGER DEFAULT 0,
  total_correct INTEGER DEFAULT 0,
  total_wrong INTEGER DEFAULT 0,
  total_timeout INTEGER DEFAULT 0,
  accuracy_percentage NUMERIC(5,2) DEFAULT 0,
  avg_response_time_ms INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  last_played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Leaderboard view
CREATE VIEW public.www_leaderboard AS
SELECT 
  ws.user_id,
  ws.total_points,
  ws.games_won,
  ws.total_games,
  ws.accuracy_percentage,
  ws.best_streak,
  ws.last_played_at,
  RANK() OVER (ORDER BY ws.total_points DESC) as rank
FROM public.www_user_stats ws
WHERE ws.total_games > 0
ORDER BY ws.total_points DESC;

-- Enable RLS
ALTER TABLE public.www_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.www_bot_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.www_game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.www_game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.www_round_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.www_user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for www_questions (public read for active)
CREATE POLICY "Anyone can read active www questions" ON public.www_questions
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage www questions" ON public.www_questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- RLS for bot profiles (public read)
CREATE POLICY "Anyone can read active bot profiles" ON public.www_bot_profiles
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bot profiles" ON public.www_bot_profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- RLS for game sessions
CREATE POLICY "Users can view their game sessions" ON public.www_game_sessions
  FOR SELECT USING (
    host_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.www_game_participants 
      WHERE session_id = www_game_sessions.id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create sessions" ON public.www_game_sessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND host_user_id = auth.uid());

CREATE POLICY "Host can update their sessions" ON public.www_game_sessions
  FOR UPDATE USING (host_user_id = auth.uid());

-- RLS for participants
CREATE POLICY "Users can view game participants" ON public.www_game_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.www_game_sessions 
      WHERE id = www_game_participants.session_id 
      AND (host_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.www_game_participants p2 
        WHERE p2.session_id = www_game_participants.session_id 
        AND p2.user_id = auth.uid()
      ))
    )
  );

CREATE POLICY "Session host can manage participants" ON public.www_game_participants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.www_game_sessions 
      WHERE id = www_game_participants.session_id 
      AND host_user_id = auth.uid()
    )
  );

-- RLS for round answers
CREATE POLICY "Participants can view round answers after round" ON public.www_round_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.www_game_participants 
      WHERE id = www_round_answers.participant_id
      AND (user_id = auth.uid() OR is_bot = true)
    )
  );

CREATE POLICY "Participants can submit answers" ON public.www_round_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.www_game_participants 
      WHERE id = participant_id AND user_id = auth.uid()
    )
  );

-- RLS for user stats
CREATE POLICY "Users can view all stats" ON public.www_user_stats
  FOR SELECT USING (true);

CREATE POLICY "Users can update own stats" ON public.www_user_stats
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "System can insert stats" ON public.www_user_stats
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX idx_www_questions_lang_cat ON public.www_questions(language, category, is_active);
CREATE INDEX idx_www_questions_difficulty ON public.www_questions(difficulty, is_active);
CREATE INDEX idx_www_sessions_status ON public.www_game_sessions(status);
CREATE INDEX idx_www_sessions_host ON public.www_game_sessions(host_user_id);
CREATE INDEX idx_www_participants_session ON public.www_game_participants(session_id);
CREATE INDEX idx_www_participants_user ON public.www_game_participants(user_id);
CREATE INDEX idx_www_answers_session ON public.www_round_answers(session_id, round_number);
CREATE INDEX idx_www_stats_points ON public.www_user_stats(total_points DESC);

-- Enable realtime for game sessions
ALTER PUBLICATION supabase_realtime ADD TABLE public.www_game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.www_game_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.www_round_answers;

-- Insert default bot profiles
INSERT INTO public.www_bot_profiles (bot_id, display_name, avatar_key, profile_type, accuracy_easy_min, accuracy_easy_max, accuracy_medium_min, accuracy_medium_max, accuracy_hard_min, accuracy_hard_max, response_time_min, response_time_max, timeout_chance) VALUES
('nika_logic', 'ნიკა_ლოგიკა', 'bot_avatar_01', 'analyst', 70, 85, 55, 75, 35, 55, 18, 55, 5),
('mari_smart', 'მარი_ჭკვიანი', 'bot_avatar_02', 'expert', 80, 92, 65, 80, 40, 65, 4, 22, 3),
('giga_guess', 'გიგა_გემბლერი', 'bot_avatar_03', 'gambler', 40, 70, 20, 55, 10, 40, 2, 12, 15),
('lika_calm', 'ლიკა_მშვიდი', 'bot_avatar_04', 'average', 55, 75, 35, 55, 15, 30, 8, 40, 8),
('vano_begin', 'ვანო_დამწყები', 'bot_avatar_05', 'beginner', 35, 55, 15, 35, 5, 15, 12, 55, 20),
('data_davit', 'დათა_ანალიტიკოსი', 'bot_avatar_06', 'analyst', 72, 88, 58, 78, 38, 58, 20, 50, 4),
('quick_keto', 'სწრაფი_კეტო', 'bot_avatar_07', 'gambler', 45, 72, 25, 58, 12, 42, 3, 15, 12),
('zura_pro', 'ზურა_პროფი', 'bot_avatar_08', 'expert', 82, 95, 68, 82, 45, 68, 5, 20, 2),
('ana_trivia', 'ანა_ტრივია', 'bot_avatar_09', 'average', 58, 78, 38, 58, 18, 32, 10, 35, 7),
('saba_random', 'საბა_რანდომი', 'bot_avatar_10', 'beginner', 32, 52, 12, 32, 5, 12, 15, 58, 25);
