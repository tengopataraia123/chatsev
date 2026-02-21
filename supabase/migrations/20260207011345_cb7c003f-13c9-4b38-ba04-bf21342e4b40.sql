-- Add missing database functions for prediction system

-- Get or create prediction wallet
CREATE OR REPLACE FUNCTION get_or_create_prediction_wallet(p_user_id UUID)
RETURNS prediction_wallets 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE 
  v_wallet prediction_wallets; 
  v_starting INTEGER;
BEGIN
  SELECT * INTO v_wallet FROM prediction_wallets WHERE user_id = p_user_id;
  IF v_wallet IS NULL THEN
    SELECT COALESCE(value::INTEGER, 500) INTO v_starting FROM prediction_module_settings WHERE key = 'starting_coins';
    INSERT INTO prediction_wallets (user_id, coins_balance) VALUES (p_user_id, v_starting) RETURNING * INTO v_wallet;
  END IF;
  RETURN v_wallet;
END; 
$$;

-- Calculate prediction return
CREATE OR REPLACE FUNCTION calculate_prediction_return(p_stake INTEGER, p_total_diff DECIMAL, p_count INTEGER)
RETURNS INTEGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE 
  v_base DECIMAL; 
  v_combo DECIMAL;
BEGIN
  SELECT COALESCE(value::DECIMAL, 0.05) INTO v_base FROM prediction_module_settings WHERE key = 'base_bonus_pct';
  SELECT COALESCE(value::DECIMAL, 0.02) INTO v_combo FROM prediction_module_settings WHERE key = 'combo_bonus_pct';
  RETURN p_stake + FLOOR(p_stake * v_base * p_total_diff) + FLOOR(p_stake * v_combo * GREATEST(0, p_count - 1));
END; 
$$;

-- Place prediction coupon (atomic transaction)
CREATE OR REPLACE FUNCTION place_prediction_coupon(p_user_id UUID, p_stake INTEGER, p_selections JSONB)
RETURNS JSONB 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public 
AS $$
DECLARE
  v_wallet prediction_wallets; 
  v_min INTEGER; 
  v_max INTEGER; 
  v_maxsel INTEGER;
  v_coupon_id UUID; 
  v_total_diff DECIMAL := 0; 
  v_count INTEGER; 
  v_return INTEGER;
  v_sel JSONB; 
  v_diff DECIMAL; 
  v_fix RECORD;
BEGIN
  SELECT COALESCE(value::INTEGER, 10) INTO v_min FROM prediction_module_settings WHERE key = 'min_stake';
  SELECT COALESCE(value::INTEGER, 500) INTO v_max FROM prediction_module_settings WHERE key = 'max_stake';
  SELECT COALESCE(value::INTEGER, 10) INTO v_maxsel FROM prediction_module_settings WHERE key = 'max_selections';
  
  IF p_stake < v_min THEN RETURN jsonb_build_object('success', false, 'error', format('მინ: %s', v_min)); END IF;
  IF p_stake > v_max THEN RETURN jsonb_build_object('success', false, 'error', format('მაქს: %s', v_max)); END IF;
  
  v_count := jsonb_array_length(p_selections);
  IF v_count = 0 THEN RETURN jsonb_build_object('success', false, 'error', 'აირჩიეთ პროგნოზი'); END IF;
  IF v_count > v_maxsel THEN RETURN jsonb_build_object('success', false, 'error', format('მაქს %s', v_maxsel)); END IF;
  
  v_wallet := get_or_create_prediction_wallet(p_user_id);
  IF v_wallet.coins_balance < p_stake THEN RETURN jsonb_build_object('success', false, 'error', 'არასაკმარისი'); END IF;
  
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections) LOOP
    SELECT * INTO v_fix FROM prediction_fixtures WHERE id = (v_sel->>'fixture_id')::UUID AND status = 'NS';
    IF v_fix IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'მატჩი დაწყებულია'); END IF;
    SELECT difficulty_score INTO v_diff FROM prediction_markets WHERE type = (v_sel->>'market_type')::market_type;
    IF v_diff IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'არასწორი ბაზარი'); END IF;
    v_total_diff := v_total_diff + v_diff;
  END LOOP;
  
  v_return := calculate_prediction_return(p_stake, v_total_diff, v_count);
  
  INSERT INTO prediction_coupons (user_id, stake_coins, potential_return_coins, selections_count, total_difficulty)
  VALUES (p_user_id, p_stake, v_return, v_count, v_total_diff) RETURNING id INTO v_coupon_id;
  
  FOR v_sel IN SELECT * FROM jsonb_array_elements(p_selections) LOOP
    SELECT difficulty_score INTO v_diff FROM prediction_markets WHERE type = (v_sel->>'market_type')::market_type;
    INSERT INTO prediction_coupon_items (coupon_id, fixture_id, market_type, pick, difficulty_score)
    VALUES (v_coupon_id, (v_sel->>'fixture_id')::UUID, (v_sel->>'market_type')::market_type, v_sel->>'pick', v_diff);
  END LOOP;
  
  UPDATE prediction_wallets SET coins_balance = coins_balance - p_stake, total_staked = total_staked + p_stake, updated_at = now() WHERE id = v_wallet.id;
  
  INSERT INTO prediction_coin_transactions (user_id, wallet_id, amount, type, reference_id, balance_before, balance_after, description)
  VALUES (p_user_id, v_wallet.id, -p_stake, 'stake', v_coupon_id, v_wallet.coins_balance, v_wallet.coins_balance - p_stake, format('%s არჩ.', v_count));
  
  RETURN jsonb_build_object('success', true, 'coupon_id', v_coupon_id, 'stake', p_stake, 'potential_return', v_return, 'new_balance', v_wallet.coins_balance - p_stake);
END; 
$$;