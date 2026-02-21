
-- Drop old functions first
DROP FUNCTION IF EXISTS public.award_points(UUID, INTEGER, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.claim_daily_login_points(UUID);
DROP FUNCTION IF EXISTS public.send_gift_with_points(UUID, UUID, UUID, TEXT, BOOLEAN);

-- Create user_points_wallet if not exists
CREATE TABLE IF NOT EXISTS public.user_points_wallet (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance_points INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_points_wallet ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own wallet" ON public.user_points_wallet FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "System can manage wallets" ON public.user_points_wallet FOR ALL USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create points_ledger if not exists
CREATE TABLE IF NOT EXISTS public.points_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  delta_points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.points_ledger ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users can view own ledger" ON public.points_ledger FOR SELECT USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add price_coins to gifts_catalog if missing
DO $$ BEGIN
  ALTER TABLE public.gifts_catalog ADD COLUMN IF NOT EXISTS price_coins INTEGER NOT NULL DEFAULT 10;
EXCEPTION WHEN others THEN NULL;
END $$;

-- Award points function
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id TEXT DEFAULT NULL
) RETURNS void AS $$
BEGIN
  INSERT INTO public.user_points_wallet (user_id, balance_points, total_earned)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE
  SET balance_points = user_points_wallet.balance_points + p_points,
      total_earned = user_points_wallet.total_earned + p_points,
      updated_at = now();

  INSERT INTO public.points_ledger (user_id, delta_points, reason, reference_type, reference_id)
  VALUES (p_user_id, p_points, p_reason, p_ref_type, p_ref_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Daily login claim
CREATE OR REPLACE FUNCTION public.claim_daily_login_points(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_already_claimed BOOLEAN;
  v_new_balance INTEGER;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM public.points_ledger
    WHERE user_id = p_user_id AND reason = 'daily_login'
    AND created_at::date = v_today
  ) INTO v_already_claimed;

  IF v_already_claimed THEN
    SELECT balance_points INTO v_new_balance FROM public.user_points_wallet WHERE user_id = p_user_id;
    RETURN json_build_object('success', false, 'already_claimed', true, 'new_balance', COALESCE(v_new_balance, 0));
  END IF;

  PERFORM public.award_points(p_user_id, 10, 'daily_login');
  SELECT balance_points INTO v_new_balance FROM public.user_points_wallet WHERE user_id = p_user_id;
  RETURN json_build_object('success', true, 'points_awarded', 10, 'new_balance', v_new_balance);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Send gift with points
CREATE OR REPLACE FUNCTION public.send_gift_with_points(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_gift_id UUID,
  p_message TEXT DEFAULT NULL,
  p_is_anonymous BOOLEAN DEFAULT false
) RETURNS JSON AS $$
DECLARE
  v_price INTEGER;
  v_balance INTEGER;
  v_gift_name TEXT;
  v_gift_record RECORD;
  v_user_gift_id UUID;
  v_sender_name TEXT;
BEGIN
  SELECT * INTO v_gift_record FROM public.gifts_catalog WHERE id = p_gift_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'gift_not_found');
  END IF;

  v_price := v_gift_record.price_coins;
  v_gift_name := v_gift_record.name_ka;

  SELECT COALESCE(balance_points, 0) INTO v_balance FROM public.user_points_wallet WHERE user_id = p_sender_id;

  IF COALESCE(v_balance, 0) < v_price THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_points', 'balance', COALESCE(v_balance,0), 'price', v_price);
  END IF;

  UPDATE public.user_points_wallet
  SET balance_points = balance_points - v_price, total_spent = total_spent + v_price, updated_at = now()
  WHERE user_id = p_sender_id;

  INSERT INTO public.points_ledger (user_id, delta_points, reason, reference_type, reference_id)
  VALUES (p_sender_id, -v_price, 'gift_purchase', 'gift', p_gift_id::text);

  INSERT INTO public.user_gifts (gift_id, sender_user_id, receiver_user_id, message, is_anonymous)
  VALUES (p_gift_id, p_sender_id, p_receiver_id, p_message, p_is_anonymous)
  RETURNING id INTO v_user_gift_id;

  SELECT username INTO v_sender_name FROM public.profiles WHERE user_id = p_sender_id;

  BEGIN
    INSERT INTO public.notifications (user_id, type, actor_user_id, entity_id, title, body)
    VALUES (p_receiver_id, 'gift_received', p_sender_id, v_user_gift_id,
      'საჩუქარი მიიღე 🎁', COALESCE(v_sender_name, 'ვიღაც') || ' გაჩუქათ ' || v_gift_name);
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RETURN json_build_object('success', true, 'gift_id', v_user_gift_id, 'points_spent', v_price, 'new_balance', v_balance - v_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activity triggers
CREATE OR REPLACE FUNCTION public.trg_award_post_points() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 10, 'post_created', 'post', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trg_award_comment_points() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 5, 'comment_created', 'comment', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.trg_award_like_points() RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.award_points(NEW.user_id, 1, 'like_given', 'like', NEW.id::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_post_points ON public.posts;
DROP TRIGGER IF EXISTS trg_award_comment_points ON public.post_comments;
DROP TRIGGER IF EXISTS trg_award_like_points ON public.post_likes;

CREATE TRIGGER trg_award_post_points AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.trg_award_post_points();
CREATE TRIGGER trg_award_comment_points AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.trg_award_comment_points();
CREATE TRIGGER trg_award_like_points AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.trg_award_like_points();

-- Sync existing gamification points
INSERT INTO public.user_points_wallet (user_id, balance_points, total_earned)
SELECT user_id, total_points, total_points
FROM public.user_gamification
WHERE total_points > 0
ON CONFLICT (user_id) DO UPDATE
SET balance_points = GREATEST(user_points_wallet.balance_points, EXCLUDED.balance_points),
    total_earned = GREATEST(user_points_wallet.total_earned, EXCLUDED.total_earned);
