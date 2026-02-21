-- Create blocked_domains table for anti-advertising system
CREATE TABLE public.blocked_domains (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ad_violations table to track violations
CREATE TABLE public.ad_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  target_user_id UUID,
  original_text TEXT NOT NULL,
  filtered_text TEXT NOT NULL,
  detected_domain TEXT NOT NULL,
  context_type TEXT NOT NULL, -- 'private_message', 'group_chat', 'comment', 'post'
  context_id TEXT, -- ID of the message/comment/post
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.blocked_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_violations ENABLE ROW LEVEL SECURITY;

-- RLS policies for blocked_domains
CREATE POLICY "Anyone can view active blocked domains"
ON public.blocked_domains
FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage blocked domains"
ON public.blocked_domains
FOR ALL
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- RLS policies for ad_violations
CREATE POLICY "Admins can view all violations"
ON public.ad_violations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

CREATE POLICY "System can insert violations"
ON public.ad_violations
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can update violations"
ON public.ad_violations
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));

-- Enable realtime for ad_violations (for admin alerts)
ALTER PUBLICATION supabase_realtime ADD TABLE public.ad_violations;

-- Create trigger for updated_at
CREATE TRIGGER update_blocked_domains_updated_at
BEFORE UPDATE ON public.blocked_domains
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some default blocked domains
INSERT INTO public.blocked_domains (domain) VALUES
('sev.ge'),
('chati.ge'),
('love.ge')
ON CONFLICT (domain) DO NOTHING;