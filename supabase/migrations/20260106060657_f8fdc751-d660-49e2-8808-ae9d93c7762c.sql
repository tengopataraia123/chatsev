-- Create VIP purchases table
CREATE TABLE public.vip_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  vip_type TEXT NOT NULL DEFAULT 'standard',
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  points_spent INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Enable RLS
ALTER TABLE public.vip_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own VIP purchases"
ON public.vip_purchases
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view active VIP status"
ON public.vip_purchases
FOR SELECT
TO authenticated
USING (is_active = true AND expires_at > now());

CREATE POLICY "Users can insert their own VIP purchases"
ON public.vip_purchases
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own VIP purchases"
ON public.vip_purchases
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

-- Create shop items table
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  item_type TEXT NOT NULL,
  price_points INTEGER NOT NULL,
  duration_days INTEGER,
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;

-- Anyone can view active shop items
CREATE POLICY "Anyone can view active shop items"
ON public.shop_items
FOR SELECT
TO authenticated
USING (is_active = true);

-- Admins can manage shop items
CREATE POLICY "Admins can manage shop items"
ON public.shop_items
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Insert default VIP packages
INSERT INTO public.shop_items (name, description, item_type, price_points, duration_days, icon, sort_order) VALUES
('VIP Bronze - 7 დღე', 'ბრინჯაოს VIP სტატუსი 7 დღით. სპეციალური ბეჯი და სტილები.', 'vip_bronze', 500, 7, '🥉', 1),
('VIP Silver - 14 დღე', 'ვერცხლის VIP სტატუსი 14 დღით. გაუმჯობესებული ბეჯი და სტილები.', 'vip_silver', 900, 14, '🥈', 2),
('VIP Gold - 30 დღე', 'ოქროს VIP სტატუსი 30 დღით. პრემიუმ ბეჯი და ექსკლუზიური სტილები.', 'vip_gold', 1500, 30, '🥇', 3),
('VIP Diamond - 60 დღე', 'ბრილიანტის VIP სტატუსი 60 დღით. საუკეთესო ბეჯი და ყველა სტილი.', 'vip_diamond', 2500, 60, '💎', 4);