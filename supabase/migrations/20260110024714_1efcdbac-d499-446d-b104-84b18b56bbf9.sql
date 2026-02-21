
-- Fix function search paths for security
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_dating_profile_completion()
RETURNS TRIGGER AS $$
DECLARE
  completion integer := 0;
  total_fields integer := 10;
  filled_fields integer := 0;
BEGIN
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
  
  completion := (filled_fields * 100) / total_fields;
  NEW.profile_completion_pct := completion;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_dating_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.dating_profiles
  SET last_active_at = now()
  WHERE user_id = NEW.sender_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
