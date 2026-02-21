CREATE OR REPLACE FUNCTION public.start_fm_live_match(p_fixture_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture record;
  v_live_match_id uuid;
  v_home_owner uuid;
  v_away_owner uuid;
BEGIN
  SELECT f.*, 
         hc.owner_id as home_owner_id,
         ac.owner_id as away_owner_id
  INTO v_fixture
  FROM fm_fixtures f
  JOIN fm_clubs hc ON hc.id = f.home_club_id
  JOIN fm_clubs ac ON ac.id = f.away_club_id
  WHERE f.id = p_fixture_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Fixture not found';
  END IF;

  v_home_owner := v_fixture.home_owner_id;
  v_away_owner := v_fixture.away_owner_id;

  INSERT INTO fm_live_matches (fixture_id, status, current_minute, home_score, away_score)
  VALUES (p_fixture_id, 'live', 0, 0, 0)
  RETURNING id INTO v_live_match_id;

  UPDATE fm_fixtures SET status = 'live' WHERE id = p_fixture_id;

  IF v_home_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, from_user_id, type, message, related_type, related_id)
    VALUES (v_home_owner, v_home_owner, 'fm_match', '⚽ თქვენი მატჩი დაიწყო! უყურეთ ლაივში', 'fm_live_match', v_live_match_id);
  END IF;
  IF v_away_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, from_user_id, type, message, related_type, related_id)
    VALUES (v_away_owner, v_away_owner, 'fm_match', '⚽ თქვენი მატჩი დაიწყო! უყურეთ ლაივში', 'fm_live_match', v_live_match_id);
  END IF;

  RETURN v_live_match_id;
END;
$$;