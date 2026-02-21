-- Add account deactivation fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'deactivated')),
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivation_reason TEXT,
ADD COLUMN IF NOT EXISTS deactivated_by TEXT CHECK (deactivated_by IN ('self', 'admin')),
ADD COLUMN IF NOT EXISTS reactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reactivation_count INT DEFAULT 0;

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON public.profiles(account_status);
CREATE INDEX IF NOT EXISTS idx_profiles_deactivated_at ON public.profiles(deactivated_at);

-- Update existing profiles to have 'active' status
UPDATE public.profiles SET account_status = 'active' WHERE account_status IS NULL;

-- Create function to check if user account is active (for use in queries)
CREATE OR REPLACE FUNCTION public.is_account_active(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT account_status = 'active' FROM public.profiles WHERE user_id = _user_id),
    true
  )
$$;