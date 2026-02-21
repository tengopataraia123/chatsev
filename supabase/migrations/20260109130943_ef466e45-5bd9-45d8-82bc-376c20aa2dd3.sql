-- Add password_changed_at column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMP WITH TIME ZONE;