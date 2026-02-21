-- Add cover_url column to profiles table for cover photo
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;