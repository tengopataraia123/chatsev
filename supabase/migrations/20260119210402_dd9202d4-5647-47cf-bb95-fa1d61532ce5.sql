-- Add browser and device info columns
ALTER TABLE public.device_accounts 
ADD COLUMN IF NOT EXISTS browser_name TEXT,
ADD COLUMN IF NOT EXISTS device_type TEXT;