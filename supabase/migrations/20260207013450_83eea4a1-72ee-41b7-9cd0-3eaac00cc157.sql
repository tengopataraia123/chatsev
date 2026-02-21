-- ================================
-- CHALLENGES MODULE (გამოწვევები)
-- ================================

-- Challenge definitions
CREATE TABLE IF NOT EXISTS public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image_url TEXT,
  challenge_type TEXT NOT NULL DEFAULT 'photo',
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reward_points INTEGER DEFAULT 100,
  is_active BOOLEAN DEFAULT true,
  is_featured BOOLEAN DEFAULT false,
  rules TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge submissions
CREATE TABLE IF NOT EXISTS public.challenge_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT,
  votes_count INTEGER DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Challenge votes
CREATE TABLE IF NOT EXISTS public.challenge_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.challenge_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submission_id, user_id)
);

-- ================================
-- CONFESSIONS MODULE (კონფესიები)
-- ================================

CREATE TABLE IF NOT EXISTS public.confessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  mood TEXT,
  is_anonymous BOOLEAN DEFAULT true,
  user_id UUID NOT NULL,
  reactions_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Confession reactions
CREATE TABLE IF NOT EXISTS public.confession_reactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reaction_type TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(confession_id, user_id)
);

-- Confession comments
CREATE TABLE IF NOT EXISTS public.confession_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- ================================
-- JOBS MODULE (ვაკანსიები)
-- ================================

CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  description TEXT NOT NULL,
  requirements TEXT,
  salary_min INTEGER,
  salary_max INTEGER,
  salary_currency TEXT DEFAULT 'GEL',
  location TEXT,
  job_type TEXT DEFAULT 'full-time',
  category TEXT NOT NULL,
  experience_level TEXT DEFAULT 'mid',
  is_remote BOOLEAN DEFAULT false,
  contact_email TEXT,
  contact_phone TEXT,
  application_url TEXT,
  views_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'active',
  expires_at TIMESTAMP WITH TIME ZONE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Job applications
CREATE TABLE IF NOT EXISTS public.job_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  cover_letter TEXT,
  cv_url TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- Job bookmarks
CREATE TABLE IF NOT EXISTS public.job_bookmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(job_id, user_id)
);

-- ================================
-- FITNESS MODULE (ფიტნესი)
-- ================================

-- Workout types
CREATE TABLE IF NOT EXISTS public.workout_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  calories_per_minute NUMERIC(5,2) DEFAULT 5,
  category TEXT DEFAULT 'cardio',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User workouts
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  workout_type_id UUID REFERENCES public.workout_types(id),
  custom_name TEXT,
  duration_minutes INTEGER NOT NULL,
  calories_burned INTEGER,
  distance_km NUMERIC(6,2),
  notes TEXT,
  mood TEXT,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fitness goals
CREATE TABLE IF NOT EXISTS public.fitness_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  goal_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  current_value INTEGER DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fitness challenges
CREATE TABLE IF NOT EXISTS public.fitness_challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  challenge_type TEXT NOT NULL,
  target_value INTEGER NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reward_points INTEGER DEFAULT 50,
  participants_count INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fitness challenge participants
CREATE TABLE IF NOT EXISTS public.fitness_challenge_participants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.fitness_challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  progress_value INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- ================================
-- ENABLE RLS ON ALL TABLES
-- ================================

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_challenge_participants ENABLE ROW LEVEL SECURITY;

-- ================================
-- RLS POLICIES
-- ================================

-- Challenges
CREATE POLICY "Challenges viewable by everyone" ON public.challenges FOR SELECT USING (true);
CREATE POLICY "Auth users can create challenges" ON public.challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own challenges" ON public.challenges FOR UPDATE USING (auth.uid() = created_by);

-- Challenge submissions
CREATE POLICY "Submissions viewable by everyone" ON public.challenge_submissions FOR SELECT USING (true);
CREATE POLICY "Auth users can submit" ON public.challenge_submissions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own submissions" ON public.challenge_submissions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own submissions" ON public.challenge_submissions FOR DELETE USING (auth.uid() = user_id);

-- Challenge votes
CREATE POLICY "Votes viewable by everyone" ON public.challenge_votes FOR SELECT USING (true);
CREATE POLICY "Auth users can vote" ON public.challenge_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own votes" ON public.challenge_votes FOR DELETE USING (auth.uid() = user_id);

-- Confessions
CREATE POLICY "Active confessions viewable" ON public.confessions FOR SELECT USING (status = 'active');
CREATE POLICY "Auth users create confessions" ON public.confessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own confessions" ON public.confessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own confessions" ON public.confessions FOR DELETE USING (auth.uid() = user_id);

-- Confession reactions
CREATE POLICY "Confession reactions viewable" ON public.confession_reactions FOR SELECT USING (true);
CREATE POLICY "Auth users can react" ON public.confession_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own reactions" ON public.confession_reactions FOR DELETE USING (auth.uid() = user_id);

-- Confession comments
CREATE POLICY "Confession comments viewable" ON public.confession_comments FOR SELECT USING (true);
CREATE POLICY "Auth users can comment" ON public.confession_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.confession_comments FOR DELETE USING (auth.uid() = user_id);

-- Jobs
CREATE POLICY "Active jobs viewable" ON public.jobs FOR SELECT USING (status = 'active');
CREATE POLICY "Auth users create jobs" ON public.jobs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own jobs" ON public.jobs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own jobs" ON public.jobs FOR DELETE USING (auth.uid() = user_id);

-- Job applications
CREATE POLICY "Users view own applications" ON public.job_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Job owners view applications" ON public.job_applications FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jobs WHERE jobs.id = job_applications.job_id AND jobs.user_id = auth.uid())
);
CREATE POLICY "Auth users can apply" ON public.job_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own applications" ON public.job_applications FOR UPDATE USING (auth.uid() = user_id);

-- Job bookmarks
CREATE POLICY "Users view own bookmarks" ON public.job_bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can bookmark" ON public.job_bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users remove own bookmarks" ON public.job_bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Workout types
CREATE POLICY "Workout types viewable" ON public.workout_types FOR SELECT USING (true);

-- Workouts
CREATE POLICY "Users view own workouts" ON public.workouts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own workouts" ON public.workouts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own workouts" ON public.workouts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own workouts" ON public.workouts FOR DELETE USING (auth.uid() = user_id);

-- Fitness goals
CREATE POLICY "Users view own goals" ON public.fitness_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users create own goals" ON public.fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own goals" ON public.fitness_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own goals" ON public.fitness_goals FOR DELETE USING (auth.uid() = user_id);

-- Fitness challenges
CREATE POLICY "Fitness challenges viewable" ON public.fitness_challenges FOR SELECT USING (true);
CREATE POLICY "Auth users create fitness challenges" ON public.fitness_challenges FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Users update own fitness challenges" ON public.fitness_challenges FOR UPDATE USING (auth.uid() = created_by);

-- Fitness challenge participants
CREATE POLICY "Challenge participants viewable" ON public.fitness_challenge_participants FOR SELECT USING (true);
CREATE POLICY "Users can join challenges" ON public.fitness_challenge_participants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own participation" ON public.fitness_challenge_participants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can leave challenges" ON public.fitness_challenge_participants FOR DELETE USING (auth.uid() = user_id);

-- ================================
-- INSERT DEFAULT WORKOUT TYPES
-- ================================

INSERT INTO public.workout_types (name, icon, color, calories_per_minute, category) VALUES
('სირბილი', 'running', '#EF4444', 10, 'cardio'),
('სიარული', 'footprints', '#22C55E', 4, 'cardio'),
('ველოსიპედი', 'bike', '#3B82F6', 8, 'cardio'),
('ცურვა', 'waves', '#06B6D4', 9, 'cardio'),
('იოგა', 'heart', '#A855F7', 3, 'flexibility'),
('სტრეჩინგი', 'stretch', '#EC4899', 2, 'flexibility'),
('ძალოვანი', 'dumbbell', '#F97316', 6, 'strength'),
('HIIT', 'zap', '#DC2626', 12, 'cardio'),
('ფეხბურთი', 'circle', '#10B981', 9, 'sports'),
('კალათბურთი', 'circle-dot', '#8B5CF6', 8, 'sports'),
('ჩოგბურთი', 'circle', '#F59E0B', 7, 'sports'),
('ცეკვა', 'music', '#EC4899', 6, 'cardio')
ON CONFLICT DO NOTHING;

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.confessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.confession_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_submissions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.challenge_votes;