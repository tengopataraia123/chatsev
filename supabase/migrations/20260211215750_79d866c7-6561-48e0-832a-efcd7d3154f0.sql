
-- RPC to purchase VIP status with points
CREATE OR REPLACE FUNCTION public.purchase_vip_with_points(
  p_user_id UUID,
  p_vip_type TEXT DEFAULT 'vip_bronze'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost INT;
  v_days INT;
  v_balance INT;
  v_new_balance INT;
  v_purchase_id UUID;
BEGIN
  -- Determine cost and duration
  CASE p_vip_type
    WHEN 'vip_bronze' THEN v_cost := 100; v_days := 7;
    WHEN 'vip_silver' THEN v_cost := 250; v_days := 14;
    WHEN 'vip_gold' THEN v_cost := 500; v_days := 30;
    WHEN 'vip_diamond' THEN v_cost := 1000; v_days := 60;
    ELSE RETURN jsonb_build_object('success', false, 'error', 'invalid_vip_type');
  END CASE;

  -- Check balance
  SELECT balance_points INTO v_balance
  FROM user_points_wallet
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_balance IS NULL OR v_balance < v_cost THEN
    RETURN jsonb_build_object('success', false, 'error', 'insufficient_points', 'balance', COALESCE(v_balance, 0), 'cost', v_cost);
  END IF;

  -- Deactivate old VIP if any
  UPDATE vip_purchases SET is_active = false WHERE user_id = p_user_id AND is_active = true;

  -- Deduct points
  UPDATE user_points_wallet
  SET balance_points = balance_points - v_cost,
      total_spent = total_spent + v_cost,
      updated_at = now()
  WHERE user_id = p_user_id
  RETURNING balance_points INTO v_new_balance;

  -- Create VIP purchase
  INSERT INTO vip_purchases (user_id, vip_type, points_spent, purchased_at, expires_at, is_active)
  VALUES (p_user_id, p_vip_type, v_cost, now(), now() + (v_days || ' days')::INTERVAL, true)
  RETURNING id INTO v_purchase_id;

  -- Log the spend
  INSERT INTO activity_points_log (user_id, action, points, description)
  VALUES (p_user_id, 'vip_purchase', -v_cost, p_vip_type || ' VIP შეძენა');

  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'vip_type', p_vip_type,
    'points_spent', v_cost,
    'new_balance', v_new_balance,
    'expires_at', (now() + (v_days || ' days')::INTERVAL)::TEXT,
    'days', v_days
  );
END;
$$;
