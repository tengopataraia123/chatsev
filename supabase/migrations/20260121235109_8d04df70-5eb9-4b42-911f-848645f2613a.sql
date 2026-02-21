-- Drop and recreate the status check constraint to include 'calling'
ALTER TABLE public.calls DROP CONSTRAINT IF EXISTS calls_status_check;

ALTER TABLE public.calls ADD CONSTRAINT calls_status_check 
CHECK (status = ANY (ARRAY['pending'::text, 'calling'::text, 'ringing'::text, 'active'::text, 'ended'::text, 'missed'::text, 'declined'::text, 'busy'::text, 'connecting'::text]));