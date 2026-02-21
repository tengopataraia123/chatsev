-- Create age_rating enum
CREATE TYPE public.age_rating AS ENUM ('0+', '6+', '12+', '16+', '18+');

-- Create movie_source_type enum
CREATE TYPE public.movie_source_type AS ENUM ('iframe', 'mp4', 'hls_m3u8', 'youtube', 'vimeo', 'external');

-- Create movie_quality enum
CREATE TYPE public.movie_quality AS ENUM ('360p', '480p', '720p', '1080p', '4K');

-- Create movie_status enum
CREATE TYPE public.movie_status AS ENUM ('draft', 'published');

-- Create genres table
CREATE TABLE public.movie_genres (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ka TEXT NOT NULL,
  name_en TEXT,
  slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create movies table
CREATE TABLE public.movies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title_ka TEXT NOT NULL,
  title_en TEXT,
  year INTEGER CHECK (year >= 1800 AND year <= 2100),
  genres TEXT[] DEFAULT '{}',
  country TEXT,
  duration_minutes INTEGER CHECK (duration_minutes > 0),
  description_ka TEXT,
  description_en TEXT,
  poster_url TEXT,
  trailer_url TEXT,
  age_rating public.age_rating DEFAULT '0+',
  tags TEXT[] DEFAULT '{}',
  status public.movie_status DEFAULT 'draft',
  views_count INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create movie_sources table
CREATE TABLE public.movie_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  source_type public.movie_source_type NOT NULL DEFAULT 'iframe',
  quality public.movie_quality,
  language TEXT DEFAULT 'KA',
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create movies_genres junction table for many-to-many
CREATE TABLE public.movies_genres_junction (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE CASCADE,
  genre_id UUID NOT NULL REFERENCES public.movie_genres(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(movie_id, genre_id)
);

-- Create indexes for performance
CREATE INDEX idx_movies_status ON public.movies(status);
CREATE INDEX idx_movies_year ON public.movies(year);
CREATE INDEX idx_movies_genres ON public.movies USING GIN(genres);
CREATE INDEX idx_movies_created_at ON public.movies(created_at DESC);
CREATE INDEX idx_movie_sources_movie_id ON public.movie_sources(movie_id);
CREATE INDEX idx_movie_sources_active ON public.movie_sources(is_active);
CREATE INDEX idx_movies_genres_junction_movie ON public.movies_genres_junction(movie_id);
CREATE INDEX idx_movies_genres_junction_genre ON public.movies_genres_junction(genre_id);

-- Enable RLS on all tables
ALTER TABLE public.movie_genres ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movie_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies_genres_junction ENABLE ROW LEVEL SECURITY;

-- Create helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- RLS Policies for movie_genres
CREATE POLICY "Anyone can view genres"
  ON public.movie_genres FOR SELECT
  USING (true);

CREATE POLICY "Only super_admin can insert genres"
  ON public.movie_genres FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can update genres"
  ON public.movie_genres FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can delete genres"
  ON public.movie_genres FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for movies
CREATE POLICY "Anyone can view published movies"
  ON public.movies FOR SELECT
  USING (status = 'published' OR public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can insert movies"
  ON public.movies FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can update movies"
  ON public.movies FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can delete movies"
  ON public.movies FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for movie_sources
CREATE POLICY "Anyone can view active sources of published movies"
  ON public.movie_sources FOR SELECT
  USING (
    is_active = true AND EXISTS (
      SELECT 1 FROM public.movies 
      WHERE id = movie_id AND status = 'published'
    )
    OR public.is_super_admin(auth.uid())
  );

CREATE POLICY "Only super_admin can insert sources"
  ON public.movie_sources FOR INSERT
  WITH CHECK (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can update sources"
  ON public.movie_sources FOR UPDATE
  USING (public.is_super_admin(auth.uid()));

CREATE POLICY "Only super_admin can delete sources"
  ON public.movie_sources FOR DELETE
  USING (public.is_super_admin(auth.uid()));

-- RLS Policies for movies_genres_junction
CREATE POLICY "Anyone can view movie-genre relations"
  ON public.movies_genres_junction FOR SELECT
  USING (true);

CREATE POLICY "Only super_admin can manage movie-genre relations"
  ON public.movies_genres_junction FOR ALL
  USING (public.is_super_admin(auth.uid()));

-- Function to increment movie views
CREATE OR REPLACE FUNCTION public.increment_movie_views(movie_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.movies 
  SET views_count = COALESCE(views_count, 0) + 1 
  WHERE id = movie_id AND status = 'published';
END;
$$;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION public.update_movies_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_movies_timestamp
  BEFORE UPDATE ON public.movies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_movies_updated_at();

CREATE TRIGGER update_movie_sources_timestamp
  BEFORE UPDATE ON public.movie_sources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_movies_updated_at();

CREATE TRIGGER update_movie_genres_timestamp
  BEFORE UPDATE ON public.movie_genres
  FOR EACH ROW
  EXECUTE FUNCTION public.update_movies_updated_at();

-- Insert default genres
INSERT INTO public.movie_genres (name_ka, name_en, slug) VALUES
  ('მოქმედებითი', 'Action', 'action'),
  ('კომედია', 'Comedy', 'comedy'),
  ('დრამა', 'Drama', 'drama'),
  ('საშინელება', 'Horror', 'horror'),
  ('ფანტასტიკა', 'Sci-Fi', 'sci-fi'),
  ('რომანტიკა', 'Romance', 'romance'),
  ('თრილერი', 'Thriller', 'thriller'),
  ('ანიმაცია', 'Animation', 'animation'),
  ('დოკუმენტური', 'Documentary', 'documentary'),
  ('ფენტეზი', 'Fantasy', 'fantasy'),
  ('კრიმინალი', 'Crime', 'crime'),
  ('სათავგადასავლო', 'Adventure', 'adventure'),
  ('მისტიკა', 'Mystery', 'mystery'),
  ('ომის', 'War', 'war'),
  ('მუსიკალური', 'Musical', 'musical'),
  ('ბიოგრაფიული', 'Biography', 'biography'),
  ('ისტორიული', 'History', 'history'),
  ('სპორტული', 'Sport', 'sport'),
  ('საოჯახო', 'Family', 'family'),
  ('ვესტერნი', 'Western', 'western')
ON CONFLICT (slug) DO NOTHING;