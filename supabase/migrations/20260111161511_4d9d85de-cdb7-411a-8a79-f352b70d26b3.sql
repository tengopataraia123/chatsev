-- Add calls_enabled column to privacy_settings
-- Default is true (enabled), meaning only friends can call when ON
-- When false, nobody can call the user
ALTER TABLE public.privacy_settings 
ADD COLUMN IF NOT EXISTS calls_enabled BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.privacy_settings.calls_enabled IS 'When true, only friends can call. When false, nobody can call.';