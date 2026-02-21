-- Drop old status check constraint
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_status_check;

-- Add new status check constraint that includes processing status
ALTER TABLE public.videos ADD CONSTRAINT videos_status_check 
  CHECK (status IN ('pending', 'approved', 'rejected', 'processing'));

-- Also update processing_status allowed values if there's a constraint
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_processing_status_check;