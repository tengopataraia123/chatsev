-- Add theme column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS theme text DEFAULT 'dark';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_theme ON public.profiles(theme);