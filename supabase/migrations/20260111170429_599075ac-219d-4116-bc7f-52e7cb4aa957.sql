-- Add current_location column to profiles table to track where user currently is
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS current_location text DEFAULT 'მთავარი';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_current_location ON public.profiles(current_location);

-- Update existing rows
UPDATE public.profiles SET current_location = 'მთავარი' WHERE current_location IS NULL;