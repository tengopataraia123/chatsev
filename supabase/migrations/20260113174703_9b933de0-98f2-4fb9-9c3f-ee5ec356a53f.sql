-- Add status column to reels for moderation
ALTER TABLE public.reels 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'));

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_reels_status ON public.reels(status);

-- Update existing reels to be approved (since they were uploaded before moderation)
UPDATE public.reels SET status = 'approved' WHERE status IS NULL OR status = 'pending';