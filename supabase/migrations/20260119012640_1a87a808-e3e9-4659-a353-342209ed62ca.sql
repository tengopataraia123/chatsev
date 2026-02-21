-- Add rewind_history table for tracking last swipes (for undo feature)
CREATE TABLE IF NOT EXISTS public.dating_rewind_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_id UUID NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('like', 'dislike', 'super_like')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_used BOOLEAN DEFAULT false
);

-- Enable RLS
ALTER TABLE public.dating_rewind_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own rewind history" 
ON public.dating_rewind_history FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own rewind history" 
ON public.dating_rewind_history FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own rewind history" 
ON public.dating_rewind_history FOR UPDATE 
USING (auth.uid() = user_id);

-- Add boost tracking columns to dating_profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dating_profiles' 
    AND column_name = 'boost_count') THEN
    ALTER TABLE public.dating_profiles ADD COLUMN boost_count INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dating_profiles' 
    AND column_name = 'rewinds_used_today') THEN
    ALTER TABLE public.dating_profiles ADD COLUMN rewinds_used_today INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'dating_profiles' 
    AND column_name = 'last_rewind_reset') THEN
    ALTER TABLE public.dating_profiles ADD COLUMN last_rewind_reset DATE DEFAULT CURRENT_DATE;
  END IF;
END $$;

-- Create dating_daily_picks table
CREATE TABLE IF NOT EXISTS public.dating_daily_picks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  picked_user_id UUID NOT NULL,
  pick_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_viewed BOOLEAN DEFAULT false,
  is_liked BOOLEAN DEFAULT false,
  compatibility_score DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, picked_user_id, pick_date)
);

-- Enable RLS
ALTER TABLE public.dating_daily_picks ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own daily picks" 
ON public.dating_daily_picks FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert daily picks" 
ON public.dating_daily_picks FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own daily picks" 
ON public.dating_daily_picks FOR UPDATE 
USING (auth.uid() = user_id);

-- Create dating_typing_status table for typing indicators
CREATE TABLE IF NOT EXISTS public.dating_typing_status (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.dating_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  is_typing BOOLEAN DEFAULT false,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dating_typing_status ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing status
CREATE POLICY "Match participants can view typing status" 
ON public.dating_typing_status FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.dating_matches 
    WHERE id = match_id 
    AND (user1_id = auth.uid() OR user2_id = auth.uid())
  )
);

CREATE POLICY "Users can upsert own typing status" 
ON public.dating_typing_status FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own typing status" 
ON public.dating_typing_status FOR UPDATE 
USING (auth.uid() = user_id);

-- Enable realtime for typing status
ALTER PUBLICATION supabase_realtime ADD TABLE public.dating_typing_status;