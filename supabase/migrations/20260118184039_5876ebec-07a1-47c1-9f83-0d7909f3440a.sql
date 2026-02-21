-- Add missing columns to notifications table for group chat notifications
ALTER TABLE public.notifications 
ADD COLUMN IF NOT EXISTS content TEXT,
ADD COLUMN IF NOT EXISTS related_type TEXT,
ADD COLUMN IF NOT EXISTS related_id UUID;