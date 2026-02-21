-- Add reply_to_id column to private_messages for reply functionality
ALTER TABLE public.private_messages
ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES public.private_messages(id) ON DELETE SET NULL;