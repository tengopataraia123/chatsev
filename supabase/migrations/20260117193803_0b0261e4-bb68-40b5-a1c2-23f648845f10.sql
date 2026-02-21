-- Add login_email column to profiles table to track the current auth email
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS login_email TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_login_email ON public.profiles(login_email);

-- Update existing profiles with their login email based on username
UPDATE public.profiles 
SET login_email = LOWER(username) || '@metanetwork.local'
WHERE login_email IS NULL;