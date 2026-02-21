-- Add is_deleted column to track deleted messages
ALTER TABLE public.private_messages 
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- Add deleted_for_sender column to track if deleted only for sender
ALTER TABLE public.private_messages 
ADD COLUMN IF NOT EXISTS deleted_for_sender boolean DEFAULT false;

-- Add deleted_for_receiver column to track if deleted only for receiver  
ALTER TABLE public.private_messages 
ADD COLUMN IF NOT EXISTS deleted_for_receiver boolean DEFAULT false;