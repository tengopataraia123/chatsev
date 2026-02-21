-- =====================================================
-- QuizV2: Isolated Quiz Module Tables
-- =====================================================

-- Question Bank
CREATE TABLE public.quiz_v2_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'ka' CHECK (language IN ('ka', 'en', 'ru')),
  category TEXT DEFAULT 'general',
  difficulty TEXT NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy', 'medium', 'hard')),
  question_text TEXT NOT NULL,
  options JSONB NOT NULL, -- ["option1", "option2", "option3", "option4"]
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0 AND correct_index <= 3),
  explanation TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Quiz Sessions
CREATE TABLE public.quiz_v2_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  language TEXT NOT NULL DEFAULT 'ka',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  total_points INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  questions_order JSONB NOT NULL DEFAULT '[]'::jsonb -- Array of question IDs in order
);

-- Session Answers
CREATE TABLE public.quiz_v2_session_answers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.quiz_v2_sessions(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.quiz_v2_questions(id),
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_awarded INTEGER NOT NULL DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- User Stats (Leaderboard)
CREATE TABLE public.quiz_v2_user_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points INTEGER NOT NULL DEFAULT 0,
  quizzes_played INTEGER NOT NULL DEFAULT 0,
  correct_answers INTEGER NOT NULL DEFAULT 0,
  total_answers INTEGER NOT NULL DEFAULT 0,
  last_played_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_quiz_v2_questions_language ON public.quiz_v2_questions(language);
CREATE INDEX idx_quiz_v2_questions_difficulty ON public.quiz_v2_questions(difficulty);
CREATE INDEX idx_quiz_v2_questions_active ON public.quiz_v2_questions(is_active);
CREATE INDEX idx_quiz_v2_questions_category ON public.quiz_v2_questions(category);
CREATE INDEX idx_quiz_v2_sessions_user ON public.quiz_v2_sessions(user_id);
CREATE INDEX idx_quiz_v2_sessions_started ON public.quiz_v2_sessions(started_at);
CREATE INDEX idx_quiz_v2_session_answers_session ON public.quiz_v2_session_answers(session_id);
CREATE INDEX idx_quiz_v2_user_stats_points ON public.quiz_v2_user_stats(total_points DESC);
CREATE INDEX idx_quiz_v2_user_stats_user ON public.quiz_v2_user_stats(user_id);

-- Enable RLS
ALTER TABLE public.quiz_v2_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_v2_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_v2_session_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_v2_user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_v2_questions (public read for active, admin write)
CREATE POLICY "Anyone can read active questions" 
ON public.quiz_v2_questions 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage questions" 
ON public.quiz_v2_questions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'admin')
  )
);

-- RLS Policies for quiz_v2_sessions
CREATE POLICY "Users can view their own sessions" 
ON public.quiz_v2_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sessions" 
ON public.quiz_v2_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" 
ON public.quiz_v2_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for quiz_v2_session_answers
CREATE POLICY "Users can view answers in their sessions" 
ON public.quiz_v2_session_answers 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quiz_v2_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert answers in their sessions" 
ON public.quiz_v2_session_answers 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quiz_v2_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  )
);

-- RLS Policies for quiz_v2_user_stats (public read for leaderboard)
CREATE POLICY "Anyone can view stats" 
ON public.quiz_v2_user_stats 
FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own stats" 
ON public.quiz_v2_user_stats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own stats" 
ON public.quiz_v2_user_stats 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_quiz_v2_questions_updated_at
BEFORE UPDATE ON public.quiz_v2_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quiz_v2_user_stats_updated_at
BEFORE UPDATE ON public.quiz_v2_user_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert starter questions (Georgian - 50 questions as seed)
INSERT INTO public.quiz_v2_questions (language, category, difficulty, question_text, options, correct_index, explanation) VALUES
-- Easy questions (1 point each)
('ka', 'geography', 'easy', 'საქართველოს დედაქალაქი რომელია?', '["თბილისი", "ბათუმი", "ქუთაისი", "რუსთავი"]', 0, 'თბილისი საქართველოს დედაქალაქია 1122 წლიდან'),
('ka', 'geography', 'easy', 'რომელი მდინარე გადის თბილისზე?', '["მტკვარი", "რიონი", "ალაზანი", "არაგვი"]', 0, 'მტკვარი საქართველოს უდიდესი მდინარეა'),
('ka', 'science', 'easy', 'წყალი რამდენ გრადუსზე იყინება?', '["0°C", "100°C", "-10°C", "10°C"]', 0, 'წყალი 0 გრადუს ცელსიუსზე იყინება'),
('ka', 'science', 'easy', 'მზის სისტემაში რამდენი პლანეტაა?', '["8", "9", "7", "10"]', 0, '2006 წლიდან მზის სისტემაში 8 პლანეტაა'),
('ka', 'history', 'easy', 'ქართული ანბანი რამდენი ასოსგან შედგება?', '["33", "32", "34", "31"]', 0, 'ქართულ ანბანში 33 ასოა'),
('ka', 'sports', 'easy', 'ფეხბურთის გუნდში რამდენი მოთამაშეა მოედანზე?', '["11", "10", "12", "9"]', 0, 'თითოეულ გუნდში 11 მოთამაშეა'),
('ka', 'geography', 'easy', 'საქართველოს რომელი ზღვა ესაზღვრება?', '["შავი ზღვა", "კასპიის ზღვა", "ხმელთაშუა ზღვა", "წითელი ზღვა"]', 0, 'საქართველოს დასავლეთით შავი ზღვაა'),
('ka', 'science', 'easy', 'დედამიწა რა ფორმისაა?', '["სფერული", "ბრტყელი", "კუბური", "ცილინდრული"]', 0, 'დედამიწა სფერული ფორმისაა'),
('ka', 'culture', 'easy', 'ქართული ღვინო რა ჭურჭელში მზადდება ტრადიციულად?', '["ქვევრი", "კასრი", "ქილა", "დოქი"]', 0, 'ქვევრი UNESCO-ს მემკვიდრეობაა'),
('ka', 'geography', 'easy', 'საქართველოს უმაღლესი მწვერვალი რომელია?', '["შხარა", "ყაზბეგი", "უშბა", "თეთნულდი"]', 0, 'შხარა 5193 მეტრია'),

-- Medium questions (2 points each)
('ka', 'history', 'medium', 'საქართველოს ოქროს ხანა რომელ საუკუნეშია?', '["XII საუკუნე", "X საუკუნე", "XIV საუკუნე", "VIII საუკუნე"]', 0, 'XII საუკუნე - დავით აღმაშენებლისა და თამარ მეფის ეპოქა'),
('ka', 'literature', 'medium', '"ვეფხისტყაოსანს" ვინ დაწერა?', '["შოთა რუსთაველი", "ილია ჭავჭავაძე", "აკაკი წერეთელი", "ვაჟა-ფშაველა"]', 0, 'XII საუკუნის შედევრი'),
('ka', 'science', 'medium', 'სინათლის სიჩქარე წამში დაახლოებით რამდენია?', '["300,000 კმ", "150,000 კმ", "500,000 კმ", "100,000 კმ"]', 0, 'სინათლის სიჩქარე 299,792 კმ/წმ'),
('ka', 'geography', 'medium', 'რომელი ქვეყანა არ ესაზღვრება საქართველოს?', '["ირანი", "თურქეთი", "აზერბაიჯანი", "რუსეთი"]', 0, 'საქართველოს ესაზღვრება რუსეთი, აზერბაიჯანი, სომხეთი და თურქეთი'),
('ka', 'history', 'medium', 'თბილისი ვინ დააარსა?', '["ვახტანგ გორგასალი", "დავით აღმაშენებელი", "თამარ მეფე", "გიორგი ბრწყინვალე"]', 0, 'V საუკუნეში ვახტანგ გორგასალმა'),
('ka', 'science', 'medium', 'ადამიანის სხეულში რამდენი ძვალია?', '["206", "300", "150", "250"]', 0, 'ზრდასრულ ადამიანს 206 ძვალი აქვს'),
('ka', 'culture', 'medium', 'ქართული პოლიფონია UNESCO-მ როდის აღიარა?', '["2001", "1995", "2010", "1990"]', 0, '2001 წელს კაცობრიობის ზეპირი მემკვიდრეობის შედევრად'),
('ka', 'geography', 'medium', 'რომელია საქართველოს უდიდესი ტბა?', '["ფარავანი", "რიწა", "ტაბაწყური", "პალიასტომი"]', 0, 'ფარავანი 37.5 კვ.კმ ფართობით'),
('ka', 'history', 'medium', 'საქართველომ დამოუკიდებლობა როდის გამოაცხადა?', '["1991", "1918", "2003", "1989"]', 0, '1991 წლის 9 აპრილს'),
('ka', 'science', 'medium', 'DNA რას ნიშნავს?', '["დეზოქსირიბონუკლეინის მჟავა", "დინამიური ნეირო ანალიზი", "დიგიტალური ნომერი", "დეტალური ანალიზი"]', 0, 'გენეტიკური ინფორმაციის მატარებელი'),

-- Hard questions (3 points each)
('ka', 'history', 'hard', 'კოლხეთის სამეფო რომელ საუკუნეში არსებობდა?', '["VI-I ს. ძვ.წ.", "X-V ს. ძვ.წ.", "I-V ს.", "III-I ს. ძვ.წ."]', 0, 'ძველი ქართული სახელმწიფო დასავლეთ საქართველოში'),
('ka', 'science', 'hard', 'პერიოდულ ცხრილში რამდენი ელემენტია ოფიციალურად?', '["118", "108", "92", "128"]', 0, '2016 წლისთვის 118 ელემენტია აღიარებული'),
('ka', 'literature', 'hard', 'ილია ჭავჭავაძის "კაცია-ადამიანი?" როდის დაიწერა?', '["1859-1863", "1870-1875", "1880-1885", "1850-1855"]', 0, 'ცნობილი რომანი სოციალურ თემებზე'),
('ka', 'geography', 'hard', 'საქართველოს ფართობი დაახლოებით რამდენია?', '["69,700 კვ.კმ", "55,000 კვ.კმ", "85,000 კვ.კმ", "45,000 კვ.კმ"]', 0, 'ოკუპირებული ტერიტორიების ჩათვლით'),
('ka', 'history', 'hard', 'ბათუმი საქართველოს როდის შეუერთდა?', '["1878", "1918", "1991", "1801"]', 0, 'სან-სტეფანოს ზავით'),
('ka', 'science', 'hard', 'ფოტოსინთეზის დროს მცენარე რას გამოყოფს?', '["ჟანგბადს", "ნახშირორჟანგს", "აზოტს", "წყალბადს"]', 0, 'CO2 + H2O → გლუკოზა + O2'),
('ka', 'culture', 'hard', 'ჯვარი მთაწმინდაზე როდის აშენდა?', '["VI საუკუნე", "IV საუკუნე", "VIII საუკუნე", "X საუკუნე"]', 0, 'ადრეული ქართული ხუროთმოძღვრების ძეგლი'),
('ka', 'history', 'hard', 'გიორგი ბრწყინვალე მეფობდა რომელ საუკუნეში?', '["XIV საუკუნე", "XII საუკუნე", "XIII საუკუნე", "XV საუკუნე"]', 0, '1314-1346 წლებში'),
('ka', 'geography', 'hard', 'რომელია საქართველოს ყველაზე გრძელი მდინარე?', '["მტკვარი", "რიონი", "ალაზანი", "ენგური"]', 0, 'მტკვარი 1364 კმ სიგრძისაა'),
('ka', 'science', 'hard', 'პლანეტა მარსს რამდენი თანამგზავრი ჰყავს?', '["2", "1", "4", "0"]', 0, 'ფობოსი და დეიმოსი'),

-- More easy questions
('ka', 'general', 'easy', 'კვირაში რამდენი დღეა?', '["7", "5", "6", "8"]', 0, 'კვირა 7 დღისგან შედგება'),
('ka', 'general', 'easy', 'წელიწადში რამდენი თვეა?', '["12", "10", "11", "13"]', 0, '12 თვე'),
('ka', 'science', 'easy', 'რომელი პლანეტა არის დედამიწასთან ყველაზე ახლოს?', '["ვენერა", "მარსი", "მერკური", "იუპიტერი"]', 0, 'ვენერა ყველაზე ახლოს მდებარეობს'),
('ka', 'geography', 'easy', 'რომელია მსოფლიოში ყველაზე დიდი ოკეანე?', '["წყნარი ოკეანე", "ატლანტის ოკეანე", "ინდოეთის ოკეანე", "ჩრდილოეთ ყინულოვანი"]', 0, 'წყნარი ოკეანე უდიდესია'),
('ka', 'animals', 'easy', 'რომელი ცხოველი ყველაზე სწრაფია?', '["გეპარდი", "ლომი", "ცხენი", "კანგურუ"]', 0, 'გეპარდი 120 კმ/სთ სიჩქარეს აღწევს'),

-- More medium questions
('ka', 'history', 'medium', 'პირველი მსოფლიო ომი როდის დაიწყო?', '["1914", "1918", "1939", "1905"]', 0, '1914 წლის 28 ივლისი'),
('ka', 'science', 'medium', 'H2O რის ფორმულაა?', '["წყალი", "მარილი", "შაქარი", "სპირტი"]', 0, 'წყლის მოლეკულა'),
('ka', 'culture', 'medium', 'ქართული ჭადრაკის ჩემპიონი ნონა გაფრინდაშვილი რამდენჯერ გახდა მსოფლიო ჩემპიონი?', '["5", "3", "7", "2"]', 0, '5-ჯერ მსოფლიო ჩემპიონი'),
('ka', 'geography', 'medium', 'ევროპის უმაღლესი მთა რომელია?', '["მონ ბლანი", "ელბრუსი", "მატერჰორნი", "მაკალუ"]', 0, 'თუ ელბრუსს ევროპაში ჩავთვლით - ელბრუსი, წინააღმდეგ შემთხვევაში მონ ბლანი'),
('ka', 'sports', 'medium', 'ოლიმპიური თამაშები რამდენ წელიწადში ერთხელ იმართება?', '["4", "2", "3", "5"]', 0, 'ყოველ 4 წელიწადში'),

-- More hard questions
('ka', 'science', 'hard', 'ალბერტ აინშტაინის ფარდობითობის თეორია როდის გამოქვეყნდა?', '["1905", "1915", "1895", "1925"]', 0, 'სპეციალური ფარდობითობის თეორია 1905 წელს'),
('ka', 'history', 'hard', 'რომის იმპერია როდის დაეცა დასავლეთში?', '["476 წ.", "410 წ.", "500 წ.", "395 წ."]', 0, '476 წელს ბარბაროსების შემოსევით'),
('ka', 'literature', 'hard', 'ვაჟა-ფშაველას "ალუდა ქეთელაური" რომელ წელს დაიწერა?', '["1888", "1895", "1880", "1900"]', 0, 'ცნობილი პოემა'),
('ka', 'geography', 'hard', 'მსოფლიოში ყველაზე ღრმა ტბა რომელია?', '["ბაიკალი", "ტანგანიკა", "კასპიის ზღვა", "ვიქტორია"]', 0, 'ბაიკალი 1642 მეტრ სიღრმისაა'),
('ka', 'science', 'hard', 'ნეიტრონი ვინ აღმოაჩინა?', '["ჯეიმს ჩედვიკი", "ერნესტ რეზერფორდი", "ნილს ბორი", "მარი კიური"]', 0, '1932 წელს'),

-- English questions (for multi-language support)
('en', 'geography', 'easy', 'What is the capital of Georgia?', '["Tbilisi", "Batumi", "Kutaisi", "Rustavi"]', 0, 'Tbilisi has been the capital since 1122'),
('en', 'science', 'easy', 'How many planets are in our solar system?', '["8", "9", "7", "10"]', 0, 'Since 2006, there are 8 planets'),
('en', 'history', 'medium', 'When did World War II end?', '["1945", "1944", "1946", "1943"]', 0, 'September 2, 1945'),
('en', 'science', 'hard', 'What is the speed of light in vacuum?', '["299,792 km/s", "300,000 km/s", "150,000 km/s", "350,000 km/s"]', 0, 'Approximately 299,792 kilometers per second');

-- Enable realtime for leaderboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_v2_user_stats;