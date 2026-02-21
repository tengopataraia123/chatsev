-- Drop the existing check constraint
ALTER TABLE public.webrtc_signals DROP CONSTRAINT IF EXISTS webrtc_signals_signal_type_check;

-- Add a new check constraint that includes 'join-request'
ALTER TABLE public.webrtc_signals ADD CONSTRAINT webrtc_signals_signal_type_check 
CHECK (signal_type = ANY (ARRAY['offer'::text, 'answer'::text, 'ice-candidate'::text, 'join-request'::text]));