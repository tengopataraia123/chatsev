-- Add IP address column to device_accounts
ALTER TABLE public.device_accounts 
ADD COLUMN IF NOT EXISTS ip_address TEXT;

-- Create index for IP-based lookups
CREATE INDEX IF NOT EXISTS idx_device_accounts_ip ON public.device_accounts(ip_address);