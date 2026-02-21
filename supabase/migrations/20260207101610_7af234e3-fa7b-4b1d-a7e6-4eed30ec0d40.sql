-- Clean up stuck calls that are older than 5 minutes
-- These calls were never properly ended due to network issues or app crashes

-- Update old "calling" status to "missed" 
UPDATE calls 
SET status = 'missed' 
WHERE status = 'calling' 
AND created_at < NOW() - INTERVAL '5 minutes';

-- Create a function to auto-cleanup stuck calls (runs on each call check)
CREATE OR REPLACE FUNCTION public.cleanup_stuck_calls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Mark calls as missed if they've been in "calling" state for more than 2 minutes
  UPDATE calls 
  SET status = 'missed' 
  WHERE status = 'calling' 
  AND created_at < NOW() - INTERVAL '2 minutes';
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.cleanup_stuck_calls() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_stuck_calls() TO anon;