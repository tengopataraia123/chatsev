-- Add city column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city TEXT;

-- Add comment for the column
COMMENT ON COLUMN public.profiles.city IS 'City of residence for the user';