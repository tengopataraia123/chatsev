
-- Create virtual leagues table
CREATE TABLE public.virtual_leagues (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'soccer',
  icon TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create virtual teams table
CREATE TABLE public.virtual_teams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  league_id UUID REFERENCES public.virtual_leagues(id) ON DELETE CASCADE,
  logo_url TEXT,
  strength INTEGER DEFAULT 50 CHECK (strength >= 1 AND strength <= 100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create virtual matches table
CREATE TABLE public.virtual_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  league_id UUID REFERENCES public.virtual_leagues(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES public.virtual_teams(id) ON DELETE CASCADE,
  away_team_id UUID REFERENCES public.virtual_teams(id) ON DELETE CASCADE,
  home_team_name TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  home_odds NUMERIC(5,2) NOT NULL,
  away_odds NUMERIC(5,2) NOT NULL,
  draw_odds NUMERIC(5,2) NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'finished', 'cancelled')),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  result TEXT CHECK (result IN ('home', 'away', 'draw')),
  minute INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.virtual_leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.virtual_matches ENABLE ROW LEVEL SECURITY;

-- Public read access for all tables
CREATE POLICY "Anyone can view virtual leagues" ON public.virtual_leagues FOR SELECT USING (true);
CREATE POLICY "Anyone can view virtual teams" ON public.virtual_teams FOR SELECT USING (true);
CREATE POLICY "Anyone can view virtual matches" ON public.virtual_matches FOR SELECT USING (true);

-- Insert Georgian leagues
INSERT INTO public.virtual_leagues (name, country, sport, icon) VALUES
('უმაღლესი ლიგა', 'საქართველო', 'soccer', '⚽'),
('პირველი ლიგა', 'საქართველო', 'soccer', '⚽'),
('საქართველოს თასი', 'საქართველო', 'soccer', '🏆'),
('ევროპა ლიგა', 'ევროპა', 'soccer', '🌍'),
('ჩემპიონთა ლიგა', 'ევროპა', 'soccer', '⭐'),
('კალათბურთი', 'საქართველო', 'basketball', '🏀'),
('ჩოგბურთი', 'საქართველო', 'tennis', '🎾'),
('რაგბი', 'საქართველო', 'rugby', '🏉');

-- Insert Georgian soccer teams for უმაღლესი ლიგა
INSERT INTO public.virtual_teams (name, league_id, strength)
SELECT team_name, league_id, strength FROM (
  SELECT 'დინამო თბილისი' as team_name, id as league_id, 85 as strength FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'თორპედო ქუთაისი', id, 75 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'დილა გორი', id, 72 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'სამგურალი', id, 68 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'საბურთალო', id, 70 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'ლოკომოტივი თბილისი', id, 65 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'მერანი თბილისი', id, 62 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'იგოეთი', id, 60 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'რუსთავი', id, 67 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'გურია ლანჩხუთი', id, 58 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'ჩიხურა საჩხერე', id, 64 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
  UNION ALL SELECT 'სიონი ბოლნისი', id, 66 FROM virtual_leagues WHERE name = 'უმაღლესი ლიგა'
) teams;

-- Insert teams for პირველი ლიგა
INSERT INTO public.virtual_teams (name, league_id, strength)
SELECT team_name, league_id, strength FROM (
  SELECT 'სპარტაკი ცხინვალი' as team_name, id as league_id, 55 as strength FROM virtual_leagues WHERE name = 'პირველი ლიგა'
  UNION ALL SELECT 'ნორჩი დინამოელი', id, 52 FROM virtual_leagues WHERE name = 'პირველი ლიგა'
  UNION ALL SELECT 'შუქურა', id, 50 FROM virtual_leagues WHERE name = 'პირველი ლიგა'
  UNION ALL SELECT 'მარტვილი', id, 48 FROM virtual_leagues WHERE name = 'პირველი ლიგა'
  UNION ALL SELECT 'კოლხეთი ფოთი', id, 53 FROM virtual_leagues WHERE name = 'პირველი ლიგა'
  UNION ALL SELECT 'მეშახტე ტყიბული', id, 51 FROM virtual_leagues WHERE name = 'პირველი ლიგა'
  UNION ALL SELECT 'ზესტაფონი', id, 56 FROM virtual_leagues WHERE name = 'პირველი ლიგა'
  UNION ALL SELECT 'ფაზისი', id, 49 FROM virtual_leagues WHERE name = 'პირველი ლიგა'
) teams;

-- Insert European teams for ჩემპიონთა ლიგა
INSERT INTO public.virtual_teams (name, league_id, strength)
SELECT team_name, league_id, strength FROM (
  SELECT 'ბარსელონა' as team_name, id as league_id, 92 as strength FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'რეალ მადრიდი', id, 94 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'მანჩესტერ სიტი', id, 93 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'ბაიერნი', id, 91 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'პარიზ სენ-ჟერმენი', id, 89 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'ლივერპული', id, 90 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'არსენალი', id, 87 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'იუვენტუსი', id, 86 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'მილანი', id, 85 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'ინტერი', id, 88 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'ბორუსია დორტმუნდი', id, 84 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
  UNION ALL SELECT 'ატლეტიკო მადრიდი', id, 86 FROM virtual_leagues WHERE name = 'ჩემპიონთა ლიგა'
) teams;

-- Insert basketball teams
INSERT INTO public.virtual_teams (name, league_id, strength)
SELECT team_name, league_id, strength FROM (
  SELECT 'ვერა თბილისი' as team_name, id as league_id, 78 as strength FROM virtual_leagues WHERE name = 'კალათბურთი'
  UNION ALL SELECT 'მღვიმე', id, 75 FROM virtual_leagues WHERE name = 'კალათბურთი'
  UNION ALL SELECT 'ბათუმი', id, 72 FROM virtual_leagues WHERE name = 'კალათბურთი'
  UNION ALL SELECT 'რუსთავი BC', id, 70 FROM virtual_leagues WHERE name = 'კალათბურთი'
  UNION ALL SELECT 'ქუთაისი BC', id, 68 FROM virtual_leagues WHERE name = 'კალათბურთი'
  UNION ALL SELECT 'გორი BC', id, 65 FROM virtual_leagues WHERE name = 'კალათბურთი'
) teams;

-- Enable realtime for virtual_matches
ALTER PUBLICATION supabase_realtime ADD TABLE public.virtual_matches;
