
-- Drop old function with conflicting param names
DROP FUNCTION IF EXISTS public.award_points(uuid, integer, text, text, text);

-- Recreate award_points
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
) RETURNS INTEGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO public.user_points_wallet (user_id, balance_points, total_earned)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id)
  DO UPDATE SET
    balance_points = user_points_wallet.balance_points + p_points,
    total_earned = user_points_wallet.total_earned + p_points,
    updated_at = now()
  RETURNING balance_points INTO v_new_balance;

  INSERT INTO public.points_ledger (user_id, delta_points, reason, reference_type, reference_id)
  VALUES (p_user_id, p_points, p_reason, p_reference_type, p_reference_id);

  RETURN v_new_balance;
END;
$$;

-- Recreate claim_daily_login_points
DROP FUNCTION IF EXISTS public.claim_daily_login_points(uuid);
CREATE OR REPLACE FUNCTION public.claim_daily_login_points(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_claim DATE;
  v_new_balance INTEGER;
BEGIN
  SELECT created_at::date INTO v_last_claim
  FROM public.points_ledger
  WHERE user_id = p_user_id AND reason = 'daily_login'
  ORDER BY created_at DESC LIMIT 1;

  IF v_last_claim = CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'reason', 'already_claimed');
  END IF;

  v_new_balance := award_points(p_user_id, 10, 'daily_login');
  RETURN json_build_object('success', true, 'points_awarded', 10, 'new_balance', v_new_balance);
END;
$$;

-- Recreate send_gift_with_points
DROP FUNCTION IF EXISTS public.send_gift_with_points(uuid, uuid, uuid, text, boolean);
CREATE OR REPLACE FUNCTION public.send_gift_with_points(
  p_sender_id UUID, p_receiver_id UUID, p_gift_id UUID,
  p_message TEXT DEFAULT NULL, p_is_anonymous BOOLEAN DEFAULT false
) RETURNS JSON
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_price INTEGER; v_balance INTEGER; v_gift_name TEXT; v_new_gift_id UUID;
BEGIN
  SELECT price_coins, name_ka INTO v_price, v_gift_name
  FROM public.gifts_catalog WHERE id = p_gift_id AND is_active = true;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'gift_not_found'); END IF;

  SELECT balance_points INTO v_balance FROM public.user_points_wallet WHERE user_id = p_sender_id;
  v_balance := COALESCE(v_balance, 0);

  IF v_balance < v_price THEN
    RETURN json_build_object('success', false, 'error', 'insufficient_points', 'balance', v_balance, 'price', v_price);
  END IF;

  UPDATE public.user_points_wallet
  SET balance_points = balance_points - v_price, total_spent = total_spent + v_price, updated_at = now()
  WHERE user_id = p_sender_id;

  INSERT INTO public.points_ledger (user_id, delta_points, reason, reference_type, reference_id)
  VALUES (p_sender_id, -v_price, 'gift_purchase', 'gift', p_gift_id::text);

  INSERT INTO public.user_gifts (gift_id, sender_user_id, receiver_user_id, message, is_anonymous)
  VALUES (p_gift_id, p_sender_id, p_receiver_id, p_message, p_is_anonymous)
  RETURNING id INTO v_new_gift_id;

  BEGIN
    INSERT INTO public.notifications (user_id, type, actor_user_id, entity_type, entity_id, title, body)
    VALUES (p_receiver_id, 'gift_received',
      CASE WHEN p_is_anonymous THEN NULL ELSE p_sender_id END,
      'gift', v_new_gift_id::text, 'საჩუქარი მიიღე 🎁', v_gift_name);
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN json_build_object('success', true, 'gift_id', v_new_gift_id, 'points_spent', v_price, 'new_balance', v_balance - v_price);
END;
$$;

-- Recreate triggers
CREATE OR REPLACE FUNCTION public.trigger_award_post_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_points(NEW.user_id, 10, 'post_created', 'post', NEW.id::text); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_award_post_points ON public.posts;
CREATE TRIGGER trg_award_post_points AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.trigger_award_post_points();

CREATE OR REPLACE FUNCTION public.trigger_award_comment_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_points(NEW.user_id, 5, 'comment_created', 'comment', NEW.id::text); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_award_comment_points ON public.post_comments;
CREATE TRIGGER trg_award_comment_points AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.trigger_award_comment_points();

CREATE OR REPLACE FUNCTION public.trigger_award_like_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_post_owner_id UUID;
BEGIN
  PERFORM public.award_points(NEW.user_id, 1, 'like_given', 'like', NEW.id::text);
  SELECT user_id INTO v_post_owner_id FROM public.posts WHERE id = NEW.post_id;
  IF v_post_owner_id IS NOT NULL AND v_post_owner_id != NEW.user_id THEN
    PERFORM public.award_points(v_post_owner_id, 2, 'like_received', 'like', NEW.id::text);
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_award_like_points ON public.post_likes;
CREATE TRIGGER trg_award_like_points AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.trigger_award_like_points();

CREATE OR REPLACE FUNCTION public.trigger_award_story_points()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM public.award_points(NEW.user_id, 3, 'story_created', 'story', NEW.id::text); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_award_story_points ON public.stories;
CREATE TRIGGER trg_award_story_points AFTER INSERT ON public.stories FOR EACH ROW EXECUTE FUNCTION public.trigger_award_story_points();

-- Enable realtime
DO $$ BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_points_wallet; EXCEPTION WHEN OTHERS THEN NULL; END $$;
