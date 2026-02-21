-- Create ip_bans table for storing IP bans
CREATE TABLE IF NOT EXISTS public.ip_bans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  banned_by UUID NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  banned_until TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  removed_by UUID,
  removed_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Add index for faster IP lookups
CREATE INDEX IF NOT EXISTS idx_ip_bans_ip_address ON public.ip_bans(ip_address) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ip_bans_active ON public.ip_bans(is_active);

-- Enable RLS
ALTER TABLE public.ip_bans ENABLE ROW LEVEL SECURITY;

-- Only super_admin can view IP bans
CREATE POLICY "Super admins can view IP bans"
ON public.ip_bans
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Only super_admin can insert IP bans
CREATE POLICY "Super admins can insert IP bans"
ON public.ip_bans
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Only super_admin can update IP bans
CREATE POLICY "Super admins can update IP bans"
ON public.ip_bans
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'super_admin'
  )
);

-- Add ip_address column to profiles if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'last_ip_address'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN last_ip_address TEXT;
  END IF;
END $$;

-- Create function to check if IP is banned
CREATE OR REPLACE FUNCTION public.check_ip_ban(check_ip TEXT)
RETURNS TABLE (
  is_banned BOOLEAN,
  ban_id UUID,
  reason TEXT,
  banned_until TIMESTAMP WITH TIME ZONE,
  banned_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    true as is_banned,
    ib.id as ban_id,
    ib.reason,
    ib.banned_until,
    ib.created_at as banned_at
  FROM ip_bans ib
  WHERE ib.ip_address = check_ip
    AND ib.is_active = true
    AND (ib.banned_until IS NULL OR ib.banned_until > now())
  LIMIT 1;
  
  -- Return empty if no ban
  IF NOT FOUND THEN
    RETURN QUERY SELECT false::boolean, NULL::uuid, NULL::text, NULL::timestamp with time zone, NULL::timestamp with time zone;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.check_ip_ban(TEXT) TO anon, authenticated;

-- Enable realtime for ip_bans
ALTER PUBLICATION supabase_realtime ADD TABLE public.ip_bans;