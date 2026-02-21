
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
    INSERT INTO public.notifications (user_id, type, from_user_id, related_id, related_type, message)
    VALUES (
      p_receiver_id, 'gift_received', p_sender_id, v_user_gift_id::text, 'gift',
      COALESCE(v_sender_name, 'ვიღაც') || ' გაჩუქათ ' || v_gift_name || ' 🎁'
    );
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  RETURN json_build_object('success', true, 'gift_id', v_user_gift_id, 'points_spent', v_price, 'new_balance', v_balance - v_price);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
