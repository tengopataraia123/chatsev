-- Create privacy settings table
CREATE TABLE public.privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  profile_visibility TEXT NOT NULL DEFAULT 'everyone' CHECK (profile_visibility IN ('everyone', 'friends', 'nobody')),
  message_permission TEXT NOT NULL DEFAULT 'everyone' CHECK (message_permission IN ('everyone', 'friends', 'nobody')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.privacy_settings ENABLE ROW LEVEL SECURITY;

-- Users can view their own settings
CREATE POLICY "Users can view their own privacy settings"
ON public.privacy_settings
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own settings
CREATE POLICY "Users can insert their own privacy settings"
ON public.privacy_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own settings
CREATE POLICY "Users can update their own privacy settings"
ON public.privacy_settings
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow reading others' privacy settings for permission checks
CREATE POLICY "Users can read others privacy settings for checks"
ON public.privacy_settings
FOR SELECT
TO authenticated
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_privacy_settings_updated_at
BEFORE UPDATE ON public.privacy_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default privacy settings for all existing users
INSERT INTO public.privacy_settings (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;