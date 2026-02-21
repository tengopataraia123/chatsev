
-- ===== ENHANCED DATING PROFILES =====
-- Add new columns to dating_profiles for extended features
ALTER TABLE public.dating_profiles
ADD COLUMN IF NOT EXISTS photos text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS height integer,
ADD COLUMN IF NOT EXISTS smoking text DEFAULT 'not_specified',
ADD COLUMN IF NOT EXISTS drinking text DEFAULT 'not_specified',
ADD COLUMN IF NOT EXISTS relationship_status text DEFAULT 'not_specified',
ADD COLUMN IF NOT EXISTS has_children text DEFAULT 'not_specified',
ADD COLUMN IF NOT EXISTS education text,
ADD COLUMN IF NOT EXISTS occupation text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'საქართველო',
ADD COLUMN IF NOT EXISTS latitude double precision,
ADD COLUMN IF NOT EXISTS longitude double precision,
ADD COLUMN IF NOT EXISTS distance_pref_km integer DEFAULT 100,
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS show_only_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS profile_completion_pct integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS impressions_count integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_boosted boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS boost_expires_at timestamp with time zone;

-- ===== DATING LIKES TABLE (for tracking who liked whom) =====
CREATE TABLE IF NOT EXISTS public.dating_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  liker_id uuid NOT NULL,
  liked_id uuid NOT NULL,
  is_super_like boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(liker_id, liked_id)
);

ALTER TABLE public.dating_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own likes"
ON public.dating_likes FOR SELECT
USING (auth.uid() = liker_id OR auth.uid() = liked_id);

CREATE POLICY "Users can insert their own likes"
ON public.dating_likes FOR INSERT
WITH CHECK (auth.uid() = liker_id);

CREATE POLICY "Users can delete their own likes"
ON public.dating_likes FOR DELETE
USING (auth.uid() = liker_id);

-- ===== DATING BLOCKS TABLE =====
CREATE TABLE IF NOT EXISTS public.dating_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid NOT NULL,
  blocked_id uuid NOT NULL,
  reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

ALTER TABLE public.dating_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own blocks"
ON public.dating_blocks FOR SELECT
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can insert their own blocks"
ON public.dating_blocks FOR INSERT
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
ON public.dating_blocks FOR DELETE
USING (auth.uid() = blocker_id);

-- ===== DATING REPORTS TABLE =====
CREATE TABLE IF NOT EXISTS public.dating_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL,
  reported_id uuid NOT NULL,
  reason text NOT NULL,
  description text,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dating_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
ON public.dating_reports FOR SELECT
USING (auth.uid() = reporter_id);

CREATE POLICY "Users can insert their own reports"
ON public.dating_reports FOR INSERT
WITH CHECK (auth.uid() = reporter_id);

-- ===== DATING MESSAGES TABLE =====
CREATE TABLE IF NOT EXISTS public.dating_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id uuid NOT NULL REFERENCES public.dating_matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  image_url text,
  voice_url text,
  gif_id uuid REFERENCES public.gifs(id),
  is_read boolean DEFAULT false,
  read_at timestamp with time zone,
  is_deleted boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dating_messages ENABLE ROW LEVEL SECURITY;

-- Users can view messages in their matches
CREATE POLICY "Users can view messages in their matches"
ON public.dating_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.dating_matches m
    WHERE m.id = match_id
    AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    AND m.is_active = true
  )
);

-- Users can insert messages in their matches
CREATE POLICY "Users can insert messages in their matches"
ON public.dating_messages FOR INSERT
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.dating_matches m
    WHERE m.id = match_id
    AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
    AND m.is_active = true
  )
);

-- Users can update their own messages (mark as read, etc)
CREATE POLICY "Users can update messages they received"
ON public.dating_messages FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.dating_matches m
    WHERE m.id = match_id
    AND (m.user1_id = auth.uid() OR m.user2_id = auth.uid())
  )
);

-- ===== DATING VERIFICATION REQUESTS =====
CREATE TABLE IF NOT EXISTS public.dating_verifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  photo_url text NOT NULL,
  status text DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamp with time zone,
  rejection_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dating_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verifications"
ON public.dating_verifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own verifications"
ON public.dating_verifications FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ===== DATING SUPER LIKES DAILY LIMIT =====
CREATE TABLE IF NOT EXISTS public.dating_super_likes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  used_at timestamp with time zone NOT NULL DEFAULT now(),
  target_id uuid NOT NULL
);

ALTER TABLE public.dating_super_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own super likes"
ON public.dating_super_likes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own super likes"
ON public.dating_super_likes FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- ===== DATING PROFILE VIEWS =====
CREATE TABLE IF NOT EXISTS public.dating_profile_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  viewer_id uuid NOT NULL,
  viewed_id uuid NOT NULL,
  viewed_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.dating_profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view who viewed them"
ON public.dating_profile_views FOR SELECT
USING (auth.uid() = viewed_id OR auth.uid() = viewer_id);

CREATE POLICY "Users can insert profile views"
ON public.dating_profile_views FOR INSERT
WITH CHECK (auth.uid() = viewer_id);

-- ===== ADD last_message columns to dating_matches =====
ALTER TABLE public.dating_matches
ADD COLUMN IF NOT EXISTS last_message_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_message_preview text,
ADD COLUMN IF NOT EXISTS unread_count_user1 integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS unread_count_user2 integer DEFAULT 0;

-- ===== ENABLE REALTIME FOR DATING TABLES =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.dating_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.dating_likes;

-- ===== FUNCTION: Calculate match when both users like each other =====
CREATE OR REPLACE FUNCTION public.check_dating_match()
RETURNS TRIGGER AS $$
DECLARE
  reverse_like_exists boolean;
  new_match_id uuid;
BEGIN
  -- Check if the other user already liked this user
  SELECT EXISTS (
    SELECT 1 FROM public.dating_likes
    WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
  ) INTO reverse_like_exists;
  
  IF reverse_like_exists THEN
    -- Check if match doesn't already exist
    IF NOT EXISTS (
      SELECT 1 FROM public.dating_matches
      WHERE (user1_id = NEW.liker_id AND user2_id = NEW.liked_id)
         OR (user1_id = NEW.liked_id AND user2_id = NEW.liker_id)
    ) THEN
      -- Create a match
      INSERT INTO public.dating_matches (user1_id, user2_id, is_active)
      VALUES (NEW.liker_id, NEW.liked_id, true)
      RETURNING id INTO new_match_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for automatic matching
DROP TRIGGER IF EXISTS trigger_check_dating_match ON public.dating_likes;
CREATE TRIGGER trigger_check_dating_match
AFTER INSERT ON public.dating_likes
FOR EACH ROW
EXECUTE FUNCTION public.check_dating_match();

-- ===== FUNCTION: Update profile completion percentage =====
CREATE OR REPLACE FUNCTION public.update_dating_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  completion integer := 0;
  total_fields integer := 10;
  filled_fields integer := 0;
BEGIN
  -- Count filled fields
  IF NEW.bio IS NOT NULL AND NEW.bio != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.photos IS NOT NULL AND array_length(NEW.photos, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.interests IS NOT NULL AND array_length(NEW.interests, 1) > 0 THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.height IS NOT NULL THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.city IS NOT NULL AND NEW.city != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.education IS NOT NULL AND NEW.education != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.occupation IS NOT NULL AND NEW.occupation != '' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.smoking != 'not_specified' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.drinking != 'not_specified' THEN filled_fields := filled_fields + 1; END IF;
  IF NEW.relationship_status != 'not_specified' THEN filled_fields := filled_fields + 1; END IF;
  
  -- Calculate percentage
  completion := (filled_fields * 100) / total_fields;
  NEW.profile_completion_pct := completion;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_dating_completion ON public.dating_profiles;
CREATE TRIGGER trigger_update_dating_completion
BEFORE INSERT OR UPDATE ON public.dating_profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_dating_profile_completion();

-- ===== FUNCTION: Update last_active_at on activity =====
CREATE OR REPLACE FUNCTION public.update_dating_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dating_profiles
  SET last_active_at = now()
  WHERE user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_dating_activity ON public.dating_messages;
CREATE TRIGGER trigger_update_dating_activity
AFTER INSERT ON public.dating_messages
FOR EACH ROW
EXECUTE FUNCTION public.update_dating_last_active();

-- ===== INDEX for performance =====
CREATE INDEX IF NOT EXISTS idx_dating_likes_liker ON public.dating_likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_dating_likes_liked ON public.dating_likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_dating_messages_match ON public.dating_messages(match_id);
CREATE INDEX IF NOT EXISTS idx_dating_blocks_blocker ON public.dating_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_dating_profiles_active ON public.dating_profiles(is_active, is_hidden);
CREATE INDEX IF NOT EXISTS idx_dating_profiles_location ON public.dating_profiles(city, country);
