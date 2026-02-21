-- Add reply_to_id to group_chat_messages for reply functionality
ALTER TABLE public.group_chat_messages 
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.group_chat_messages(id) ON DELETE SET NULL;

-- Create dating profiles table
CREATE TABLE IF NOT EXISTS public.dating_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  bio TEXT,
  looking_for TEXT CHECK (looking_for IN ('male', 'female', 'both')),
  interests TEXT[],
  is_active BOOLEAN DEFAULT true,
  min_age INTEGER DEFAULT 18,
  max_age INTEGER DEFAULT 99,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create dating swipes table
CREATE TABLE IF NOT EXISTS public.dating_swipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  swiper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  swiped_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('left', 'right', 'super')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(swiper_id, swiped_id)
);

-- Create dating matches table
CREATE TABLE IF NOT EXISTS public.dating_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  matched_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(user1_id, user2_id)
);

-- Enable RLS
ALTER TABLE public.dating_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dating_matches ENABLE ROW LEVEL SECURITY;

-- Dating profiles policies
CREATE POLICY "Users can view active dating profiles"
ON public.dating_profiles FOR SELECT
USING (is_active = true OR user_id = auth.uid());

CREATE POLICY "Users can create own dating profile"
ON public.dating_profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dating profile"
ON public.dating_profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own dating profile"
ON public.dating_profiles FOR DELETE
USING (auth.uid() = user_id);

-- Dating swipes policies
CREATE POLICY "Users can view their own swipes"
ON public.dating_swipes FOR SELECT
USING (auth.uid() = swiper_id OR auth.uid() = swiped_id);

CREATE POLICY "Users can create swipes"
ON public.dating_swipes FOR INSERT
WITH CHECK (auth.uid() = swiper_id);

CREATE POLICY "Users can delete their swipes"
ON public.dating_swipes FOR DELETE
USING (auth.uid() = swiper_id);

-- Dating matches policies
CREATE POLICY "Users can view their matches"
ON public.dating_matches FOR SELECT
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "System can create matches"
ON public.dating_matches FOR INSERT
WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can deactivate their matches"
ON public.dating_matches FOR UPDATE
USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Enable realtime for dating
ALTER PUBLICATION supabase_realtime ADD TABLE public.dating_matches;

-- Function to check for mutual swipes and create match
CREATE OR REPLACE FUNCTION public.check_dating_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only check for matches on right or super swipes
  IF NEW.direction IN ('right', 'super') THEN
    -- Check if the other person also swiped right on us
    IF EXISTS (
      SELECT 1 FROM public.dating_swipes 
      WHERE swiper_id = NEW.swiped_id 
      AND swiped_id = NEW.swiper_id 
      AND direction IN ('right', 'super')
    ) THEN
      -- Create a match (order users by id to prevent duplicates)
      INSERT INTO public.dating_matches (user1_id, user2_id)
      VALUES (
        LEAST(NEW.swiper_id, NEW.swiped_id),
        GREATEST(NEW.swiper_id, NEW.swiped_id)
      )
      ON CONFLICT (user1_id, user2_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to automatically create matches
DROP TRIGGER IF EXISTS on_dating_swipe ON public.dating_swipes;
CREATE TRIGGER on_dating_swipe
  AFTER INSERT ON public.dating_swipes
  FOR EACH ROW
  EXECUTE FUNCTION public.check_dating_match();