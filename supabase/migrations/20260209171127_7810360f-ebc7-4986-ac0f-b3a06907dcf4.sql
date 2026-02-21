
-- Gifts catalog table
CREATE TABLE public.gifts_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ka TEXT NOT NULL,
  name_en TEXT,
  category TEXT NOT NULL DEFAULT 'neutral' CHECK (category IN ('girls', 'boys', 'neutral')),
  price_coins INTEGER NOT NULL DEFAULT 0,
  emoji TEXT NOT NULL DEFAULT '🎁',
  media_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User gifts (sent/received)
CREATE TABLE public.user_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  gift_id UUID NOT NULL REFERENCES public.gifts_catalog(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL,
  receiver_user_id UUID NOT NULL,
  message TEXT,
  is_anonymous BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_user_gifts_receiver ON public.user_gifts(receiver_user_id, created_at DESC);
CREATE INDEX idx_user_gifts_sender ON public.user_gifts(sender_user_id, created_at DESC);
CREATE INDEX idx_gifts_catalog_category ON public.gifts_catalog(category, is_active);

-- Enable RLS
ALTER TABLE public.gifts_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_gifts ENABLE ROW LEVEL SECURITY;

-- Catalog: everyone can read active gifts
CREATE POLICY "Anyone can view active gifts"
ON public.gifts_catalog FOR SELECT
USING (is_active = true);

-- Catalog: super_admin can manage
CREATE POLICY "Super admins can manage gifts catalog"
ON public.gifts_catalog FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

-- User gifts: authenticated can send
CREATE POLICY "Users can send gifts"
ON public.user_gifts FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = sender_user_id);

-- User gifts: receiver and sender can view
CREATE POLICY "Users can view their gifts"
ON public.user_gifts FOR SELECT
TO authenticated
USING (auth.uid() = receiver_user_id OR auth.uid() = sender_user_id);

-- Public can see received gifts on profiles
CREATE POLICY "Anyone can see received gifts"
ON public.user_gifts FOR SELECT
USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gifts;

-- Seed default gifts
INSERT INTO public.gifts_catalog (name_ka, category, emoji, sort_order) VALUES
-- Girls
('ვარდი', 'girls', '🌹', 1),
('გული', 'girls', '❤️', 2),
('დათვი', 'girls', '🧸', 3),
('შოკოლადი', 'girls', '🍫', 4),
('გვირგვინი', 'girls', '👑', 5),
('სუნამო', 'girls', '🌸', 6),
('პეპელა', 'girls', '🦋', 7),
('ბრილიანტი', 'girls', '💎', 8),
('თაიგული', 'girls', '💐', 9),
('ტორტი', 'girls', '🎂', 10),
-- Boys
('ფეხბურთი', 'boys', '⚽', 11),
('საათი', 'boys', '⌚', 12),
('მანქანა', 'boys', '🏎️', 13),
('თასი', 'boys', '🏆', 14),
('გეიმპადი', 'boys', '🎮', 15),
('კროსოვკი', 'boys', '👟', 16),
('სათვალე', 'boys', '🕶️', 17),
('გიტარა', 'boys', '🎸', 18),
('ყავა', 'boys', '☕', 19),
('რაკეტა', 'boys', '🚀', 20),
-- Neutral
('ვარსკვლავი', 'neutral', '⭐', 21),
('ცეცხლი', 'neutral', '🔥', 22),
('საჩუქარი', 'neutral', '🎁', 23),
('მედალი', 'neutral', '🏅', 24),
('მუსიკა', 'neutral', '🎵', 25),
('ხელოვნება', 'neutral', '🎨', 26);
