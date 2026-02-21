-- Create user_bios table for storing bio content
CREATE TABLE public.user_bios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  content TEXT NOT NULL DEFAULT '',
  content_json JSONB DEFAULT '[]'::jsonb,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'friends', 'hidden')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create bio_history table for version control
CREATE TABLE public.bio_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  content_json JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.user_bios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bio_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_bios
CREATE POLICY "Users can view public bios" 
ON public.user_bios 
FOR SELECT 
USING (
  visibility = 'public' OR 
  user_id = auth.uid() OR
  (visibility = 'friends' AND EXISTS (
    SELECT 1 FROM friendships 
    WHERE status = 'accepted' 
    AND ((requester_id = auth.uid() AND addressee_id = user_bios.user_id) 
         OR (addressee_id = auth.uid() AND requester_id = user_bios.user_id))
  ))
);

CREATE POLICY "Users can manage their own bio" 
ON public.user_bios 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for bio_history
CREATE POLICY "Users can view their own bio history" 
ON public.bio_history 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own bio history" 
ON public.bio_history 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Admins can view and delete any bio
CREATE POLICY "Admins can view all bios"
ON public.user_bios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator', 'super_admin')
  )
);

CREATE POLICY "Admins can delete any bio"
ON public.user_bios
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'moderator', 'super_admin')
  )
);

-- Create updated_at trigger
CREATE TRIGGER update_user_bios_updated_at
BEFORE UPDATE ON public.user_bios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster lookups
CREATE INDEX idx_user_bios_user_id ON public.user_bios(user_id);
CREATE INDEX idx_bio_history_user_id ON public.bio_history(user_id);
CREATE INDEX idx_bio_history_created_at ON public.bio_history(created_at DESC);

-- Enable realtime for bio updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_bios;