-- Create analytics_events table for comprehensive user tracking
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  event_type TEXT NOT NULL DEFAULT 'registration',
  
  -- Registration & login data
  registered_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  registration_ip TEXT,
  last_login_ip TEXT,
  
  -- Device info
  user_agent_raw TEXT,
  device_type TEXT, -- mobile, desktop, tablet
  os_name TEXT,
  browser_name TEXT,
  device_model TEXT,
  
  -- Geo data
  geo_country TEXT,
  geo_city TEXT,
  
  -- Referral & UTM data
  referrer_domain TEXT,
  referrer_url TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  first_landing_path TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_analytics_events_user_id ON public.analytics_events(user_id);
CREATE INDEX idx_analytics_events_registration_ip ON public.analytics_events(registration_ip);
CREATE INDEX idx_analytics_events_registered_at ON public.analytics_events(registered_at);
CREATE INDEX idx_analytics_events_referrer_domain ON public.analytics_events(referrer_domain);
CREATE INDEX idx_analytics_events_utm_source ON public.analytics_events(utm_source);
CREATE INDEX idx_analytics_events_created_at ON public.analytics_events(created_at);
CREATE INDEX idx_analytics_events_device_type ON public.analytics_events(device_type);
CREATE INDEX idx_analytics_events_geo_country ON public.analytics_events(geo_country);

-- Enable RLS
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Only admins can view analytics
CREATE POLICY "Admins can view analytics"
ON public.analytics_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Only super admins can manage analytics data
CREATE POLICY "Super admins can manage analytics"
ON public.analytics_events
FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Service role can insert (for tracking)
CREATE POLICY "Service can insert analytics"
ON public.analytics_events
FOR INSERT
WITH CHECK (true);

-- Create referral_sources table for tracking
CREATE TABLE public.referral_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT,
  color TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default referral sources
INSERT INTO public.referral_sources (name, display_name, icon, color) VALUES
  ('google', 'Google', 'search', '#4285F4'),
  ('facebook', 'Facebook', 'facebook', '#1877F2'),
  ('instagram', 'Instagram', 'instagram', '#E4405F'),
  ('tiktok', 'TikTok', 'music', '#000000'),
  ('telegram', 'Telegram', 'send', '#0088CC'),
  ('whatsapp', 'WhatsApp', 'message-circle', '#25D366'),
  ('twitter', 'Twitter/X', 'twitter', '#1DA1F2'),
  ('direct', 'Direct', 'globe', '#6B7280'),
  ('other', 'Other', 'link', '#9CA3AF');

-- Enable RLS for referral_sources
ALTER TABLE public.referral_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view referral sources"
ON public.referral_sources FOR SELECT USING (true);

CREATE POLICY "Super admins can manage referral sources"
ON public.referral_sources FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create IP blocks table for security
CREATE TABLE public.analytics_ip_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address TEXT NOT NULL,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id),
  blocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  unblocked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_analytics_ip_blocks_ip ON public.analytics_ip_blocks(ip_address);
CREATE INDEX idx_analytics_ip_blocks_active ON public.analytics_ip_blocks(is_active);

ALTER TABLE public.analytics_ip_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view IP blocks"
ON public.analytics_ip_blocks FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage IP blocks"
ON public.analytics_ip_blocks FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Function to get analytics summary
CREATE OR REPLACE FUNCTION public.get_analytics_summary(
  start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Check admin access
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  SELECT jsonb_build_object(
    'total_users', (SELECT COUNT(*) FROM profiles),
    'new_registrations_today', (
      SELECT COUNT(*) FROM profiles 
      WHERE created_at >= CURRENT_DATE
    ),
    'new_registrations_7d', (
      SELECT COUNT(*) FROM profiles 
      WHERE created_at >= now() - INTERVAL '7 days'
    ),
    'new_registrations_30d', (
      SELECT COUNT(*) FROM profiles 
      WHERE created_at >= now() - INTERVAL '30 days'
    ),
    'active_users_24h', (
      SELECT COUNT(*) FROM profiles 
      WHERE last_seen >= now() - INTERVAL '24 hours'
    ),
    'male_count', (
      SELECT COUNT(*) FROM profiles WHERE gender = 'male'
    ),
    'female_count', (
      SELECT COUNT(*) FROM profiles WHERE gender = 'female'
    ),
    'verified_count', (
      SELECT COUNT(*) FROM profiles WHERE is_verified = true
    ),
    'unverified_count', (
      SELECT COUNT(*) FROM profiles WHERE is_verified = false OR is_verified IS NULL
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Function to get registrations by day
CREATE OR REPLACE FUNCTION public.get_registrations_by_day(
  days_back INTEGER DEFAULT 30
)
RETURNS TABLE(date DATE, count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    DATE(p.created_at) as date,
    COUNT(*) as count
  FROM profiles p
  WHERE p.created_at >= now() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(p.created_at)
  ORDER BY date;
END;
$$;

-- Function to get top referral sources
CREATE OR REPLACE FUNCTION public.get_top_referral_sources(
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE(source TEXT, visits BIGINT, registrations BIGINT, conversion_rate NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  RETURN QUERY
  SELECT 
    COALESCE(ae.referrer_domain, 'direct') as source,
    COUNT(*) as visits,
    COUNT(CASE WHEN ae.user_id IS NOT NULL THEN 1 END) as registrations,
    ROUND(
      CASE 
        WHEN COUNT(*) > 0 
        THEN COUNT(CASE WHEN ae.user_id IS NOT NULL THEN 1 END)::NUMERIC / COUNT(*)::NUMERIC * 100
        ELSE 0 
      END, 2
    ) as conversion_rate
  FROM analytics_events ae
  GROUP BY ae.referrer_domain
  ORDER BY visits DESC
  LIMIT limit_count;
END;
$$;

-- Function to get IP clusters (multiple accounts per IP)
CREATE OR REPLACE FUNCTION public.get_ip_clusters(
  min_accounts INTEGER DEFAULT 2
)
RETURNS TABLE(ip_address TEXT, account_count BIGINT, user_ids UUID[], usernames TEXT[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'super_admin')) THEN
    RAISE EXCEPTION 'Access denied - Super Admin only';
  END IF;

  RETURN QUERY
  SELECT 
    da.ip_address,
    COUNT(DISTINCT da.user_id) as account_count,
    ARRAY_AGG(DISTINCT da.user_id) as user_ids,
    ARRAY_AGG(DISTINCT da.username) as usernames
  FROM device_accounts da
  WHERE da.ip_address IS NOT NULL
  GROUP BY da.ip_address
  HAVING COUNT(DISTINCT da.user_id) >= min_accounts
  ORDER BY account_count DESC;
END;
$$;