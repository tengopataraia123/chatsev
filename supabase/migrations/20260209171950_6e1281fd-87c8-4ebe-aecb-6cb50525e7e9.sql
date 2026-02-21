
-- Drop existing conflicting function
DROP FUNCTION IF EXISTS public.award_points(uuid, integer, text, text, text);

-- Recreate with correct params
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_ref_type TEXT DEFAULT NULL,
  p_ref_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INTEGER;
BEGIN
  INSERT INTO user_points_wallet (user_id, balance_points, total_earned)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE
  SET balance_points = user_points_wallet.balance_points + p_points,
      total_earned = user_points_wallet.total_earned + p_points,
      updated_at = now();

  SELECT balance_points INTO v_new_balance FROM user_points_wallet WHERE user_id = p_user_id;

  INSERT INTO points_ledger (user_id, delta_points, reason, reference_type, reference_id)
  VALUES (p_user_id, p_points, p_reason, p_ref_type, p_ref_id);

  RETURN v_new_balance;
END;
$$;

-- Daily login reward
CREATE OR REPLACE FUNCTION public.claim_daily_login_points(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_claim DATE;
  v_new_balance INTEGER;
BEGIN
  SELECT created_at::date INTO v_last_claim
  FROM points_ledger
  WHERE user_id = p_user_id AND reason = 'daily_login'
  ORDER BY created_at DESC LIMIT 1;

  IF v_last_claim = CURRENT_DATE THEN
    RETURN json_build_object('success', false, 'error', 'already_claimed');
  END IF;

  v_new_balance := award_points(p_user_id, 10, 'daily_login');

  RETURN json_build_object('success', true, 'points_awarded', 10, 'new_balance', v_new_balance);
END;
$$;
