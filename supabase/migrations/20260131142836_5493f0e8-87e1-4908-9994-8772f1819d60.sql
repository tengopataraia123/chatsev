-- Add geolocation columns to device_accounts
ALTER TABLE public.device_accounts 
ADD COLUMN IF NOT EXISTS geo_country TEXT,
ADD COLUMN IF NOT EXISTS geo_city TEXT,
ADD COLUMN IF NOT EXISTS geo_region TEXT,
ADD COLUMN IF NOT EXISTS geo_updated_at TIMESTAMPTZ;

-- Create index for faster geo lookups
CREATE INDEX IF NOT EXISTS idx_device_accounts_geo_country ON public.device_accounts(geo_country);

-- Comment on columns
COMMENT ON COLUMN public.device_accounts.geo_country IS 'Country detected from IP geolocation';
COMMENT ON COLUMN public.device_accounts.geo_city IS 'City detected from IP geolocation';
COMMENT ON COLUMN public.device_accounts.geo_region IS 'Region/State detected from IP geolocation';