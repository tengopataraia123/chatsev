-- ===== HOROSCOPE MODULE =====
CREATE TABLE public.horoscope_signs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  name_ka TEXT NOT NULL,
  symbol TEXT NOT NULL,
  element TEXT NOT NULL,
  date_start TEXT NOT NULL,
  date_end TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.horoscope_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sign_id UUID REFERENCES public.horoscope_signs(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  prediction TEXT NOT NULL,
  love_rating INTEGER DEFAULT 3 CHECK (love_rating BETWEEN 1 AND 5),
  career_rating INTEGER DEFAULT 3 CHECK (career_rating BETWEEN 1 AND 5),
  health_rating INTEGER DEFAULT 3 CHECK (health_rating BETWEEN 1 AND 5),
  lucky_number INTEGER,
  lucky_color TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sign_id, date)
);

-- ===== DAILY FACTS MODULE =====
CREATE TABLE public.daily_facts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_text TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  source TEXT,
  is_featured BOOLEAN DEFAULT false,
  display_date DATE,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.daily_fact_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fact_id UUID REFERENCES public.daily_facts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(fact_id, user_id)
);

-- ===== WEATHER PREFERENCES =====
CREATE TABLE public.user_weather_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  city TEXT DEFAULT 'Tbilisi',
  country_code TEXT DEFAULT 'GE',
  units TEXT DEFAULT 'metric',
  show_on_profile BOOLEAN DEFAULT true,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== NEARBY USERS (uses existing profile location) =====
-- Add location fields to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_latitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS current_longitude DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS show_location BOOLEAN DEFAULT false;

-- ===== PROFILE BACKGROUNDS =====
CREATE TABLE public.profile_backgrounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  background_type TEXT DEFAULT 'solid' CHECK (background_type IN ('solid', 'gradient', 'image', 'video', 'animation')),
  background_value TEXT,
  video_url TEXT,
  animation_preset TEXT,
  gradient_colors TEXT[],
  opacity DOUBLE PRECISION DEFAULT 1.0,
  blur_amount INTEGER DEFAULT 0,
  is_enabled BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== MEMORIES (This day in history) =====
CREATE TABLE public.user_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  memory_type TEXT NOT NULL CHECK (memory_type IN ('post', 'photo', 'status', 'milestone')),
  reference_id UUID,
  reference_table TEXT,
  content TEXT,
  image_url TEXT,
  memory_date DATE NOT NULL,
  years_ago INTEGER NOT NULL,
  is_hidden BOOLEAN DEFAULT false,
  viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed horoscope signs
INSERT INTO public.horoscope_signs (name, name_ka, symbol, element, date_start, date_end, sort_order) VALUES
('aries', 'ვერძი', '♈', 'fire', '03-21', '04-19', 1),
('taurus', 'კურო', '♉', 'earth', '04-20', '05-20', 2),
('gemini', 'ტყუპები', '♊', 'air', '05-21', '06-20', 3),
('cancer', 'კირჩხიბი', '♋', 'water', '06-21', '07-22', 4),
('leo', 'ლომი', '♌', 'fire', '07-23', '08-22', 5),
('virgo', 'ქალწული', '♍', 'earth', '08-23', '09-22', 6),
('libra', 'სასწორი', '♎', 'air', '09-23', '10-22', 7),
('scorpio', 'მორიელი', '♏', 'water', '10-23', '11-21', 8),
('sagittarius', 'მშვილდოსანი', '♐', 'fire', '11-22', '12-21', 9),
('capricorn', 'თხის რქა', '♑', 'earth', '12-22', '01-19', 10),
('aquarius', 'მერწყული', '♒', 'air', '01-20', '02-18', 11),
('pisces', 'თევზები', '♓', 'water', '02-19', '03-20', 12);

-- Seed sample daily facts
INSERT INTO public.daily_facts (fact_text, category, is_featured) VALUES
('თაფლი არასოდეს ფუჭდება. არქეოლოგებმა 3000 წლის თაფლი იპოვეს ეგვიპტის პირამიდებში და ის ჯერ კიდევ საკვებად ვარგისი იყო.', 'science', true),
('ოქტოპუსს სამი გული აქვს და მისი სისხლი ლურჯი ფერისაა.', 'animals', false),
('ადამიანის ტვინი დღეში დაახლოებით 70,000 აზრს ამუშავებს.', 'human', false),
('ვენერაზე ერთი დღე ერთ წელზე მეტხანს გრძელდება.', 'space', true),
('პინგვინებს მუხლები აქვთ, უბრალოდ ბეწვის ქვეშ იმალება.', 'animals', false);

-- Enable RLS
ALTER TABLE public.horoscope_signs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.horoscope_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_fact_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_weather_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_backgrounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read horoscope signs" ON public.horoscope_signs FOR SELECT USING (true);
CREATE POLICY "Anyone can read horoscope daily" ON public.horoscope_daily FOR SELECT USING (true);
CREATE POLICY "Admins can manage horoscope" ON public.horoscope_daily FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read facts" ON public.daily_facts FOR SELECT USING (true);
CREATE POLICY "Admins can manage facts" ON public.daily_facts FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can like facts" ON public.daily_fact_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can unlike facts" ON public.daily_fact_likes FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Anyone can see likes" ON public.daily_fact_likes FOR SELECT USING (true);

CREATE POLICY "Users manage own weather settings" ON public.user_weather_settings FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users manage own backgrounds" ON public.profile_backgrounds FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view backgrounds" ON public.profile_backgrounds FOR SELECT USING (true);

CREATE POLICY "Users see own memories" ON public.user_memories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own memories" ON public.user_memories FOR ALL USING (auth.uid() = user_id);

-- Function to find nearby users
CREATE OR REPLACE FUNCTION public.get_nearby_users(
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.user_id,
    p.username,
    p.avatar_url,
    (6371 * acos(
      cos(radians(p_latitude)) * cos(radians(p.current_latitude)) *
      cos(radians(p.current_longitude) - radians(p_longitude)) +
      sin(radians(p_latitude)) * sin(radians(p.current_latitude))
    )) AS distance_km
  FROM profiles p
  WHERE p.show_location = true
    AND p.current_latitude IS NOT NULL
    AND p.current_longitude IS NOT NULL
    AND p.user_id != auth.uid()
    AND (6371 * acos(
      cos(radians(p_latitude)) * cos(radians(p.current_latitude)) *
      cos(radians(p.current_longitude) - radians(p_longitude)) +
      sin(radians(p_latitude)) * sin(radians(p.current_latitude))
    )) <= p_radius_km
  ORDER BY distance_km ASC
  LIMIT 50;
END;
$$;