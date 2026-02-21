
-- ============================================================
-- FM Two-Phase Match System: 10-minute live matches
-- ============================================================

-- 1. Function to START a live match (Phase 1)
CREATE OR REPLACE FUNCTION fm_start_live_match(p_fixture_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture RECORD;
  v_live_match_id UUID;
  v_home_ovr NUMERIC;
  v_away_ovr NUMERIC;
  v_home_energy NUMERIC;
  v_away_energy NUMERIC;
  v_home_coach_bonus NUMERIC := 0;
  v_away_coach_bonus NUMERIC := 0;
  v_home_goals INTEGER;
  v_away_goals INTEGER;
  v_home_prob NUMERIC;
  v_events JSONB := '[]'::jsonb;
  v_player_positions JSONB := '[]'::jsonb;
  v_player RECORD;
  v_home_starters TEXT[];
  v_away_starters TEXT[];
  v_home_owner UUID;
  v_away_owner UUID;
  v_attendance INTEGER;
  v_slot_x NUMERIC;
  v_slot_y NUMERIC;
BEGIN
  -- Get fixture
  SELECT * INTO v_fixture FROM fm_fixtures WHERE id = p_fixture_id AND status = 'pending';
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Calculate home team strength
  SELECT COALESCE(AVG(p.ovr), 60), COALESCE(AVG(p.stamina), 70)
  INTO v_home_ovr, v_home_energy
  FROM fm_club_players cp
  JOIN fm_players p ON p.id = cp.player_id
  WHERE cp.club_id = v_fixture.home_club_id AND cp.role = 'starter';

  SELECT COALESCE((c.bonuses->>'tactical_boost')::numeric, 0) INTO v_home_coach_bonus
  FROM fm_club_coach cc
  JOIN fm_coaches c ON c.id = cc.coach_id
  WHERE cc.club_id = v_fixture.home_club_id;

  -- Calculate away team strength
  SELECT COALESCE(AVG(p.ovr), 60), COALESCE(AVG(p.stamina), 70)
  INTO v_away_ovr, v_away_energy
  FROM fm_club_players cp
  JOIN fm_players p ON p.id = cp.player_id
  WHERE cp.club_id = v_fixture.away_club_id AND cp.role = 'starter';

  SELECT COALESCE((c.bonuses->>'tactical_boost')::numeric, 0) INTO v_away_coach_bonus
  FROM fm_club_coach cc
  JOIN fm_coaches c ON c.id = cc.coach_id
  WHERE cc.club_id = v_fixture.away_club_id;

  -- Apply bonuses (home advantage + coach + energy)
  v_home_ovr := v_home_ovr + 5 + (v_home_coach_bonus / 5) + ((v_home_energy - 70) / 10);
  v_away_ovr := v_away_ovr + (v_away_coach_bonus / 5) + ((v_away_energy - 70) / 10);
  v_home_prob := v_home_ovr / (v_home_ovr + v_away_ovr);

  -- Generate goals
  v_home_goals := FLOOR(RANDOM() * 4 * (v_home_prob + 0.2));
  v_away_goals := FLOOR(RANDOM() * 4 * ((1 - v_home_prob) + 0.2));

  -- Get starter names for events
  SELECT ARRAY_AGG(p.name) INTO v_home_starters
  FROM fm_club_players cp JOIN fm_players p ON p.id = cp.player_id
  WHERE cp.club_id = v_fixture.home_club_id AND cp.role = 'starter';

  SELECT ARRAY_AGG(p.name) INTO v_away_starters
  FROM fm_club_players cp JOIN fm_players p ON p.id = cp.player_id
  WHERE cp.club_id = v_fixture.away_club_id AND cp.role = 'starter';

  -- Generate goal events with real player names
  IF v_home_starters IS NOT NULL THEN
    FOR i IN 1..v_home_goals LOOP
      v_events := v_events || jsonb_build_object(
        'minute', FLOOR(RANDOM() * 90) + 1,
        'type', 'goal',
        'team', 'home',
        'player_name', v_home_starters[1 + FLOOR(RANDOM() * array_length(v_home_starters, 1))::int]
      );
    END LOOP;
  END IF;

  IF v_away_starters IS NOT NULL THEN
    FOR i IN 1..v_away_goals LOOP
      v_events := v_events || jsonb_build_object(
        'minute', FLOOR(RANDOM() * 90) + 1,
        'type', 'goal',
        'team', 'away',
        'player_name', v_away_starters[1 + FLOOR(RANDOM() * array_length(v_away_starters, 1))::int]
      );
    END LOOP;
  END IF;

  -- Build player positions from starters
  FOR v_player IN
    SELECT p.id, p.name, cp.slot_code, p.ovr, p.stats,
           'home' as team
    FROM fm_club_players cp JOIN fm_players p ON p.id = cp.player_id
    WHERE cp.club_id = v_fixture.home_club_id AND cp.role = 'starter'
    UNION ALL
    SELECT p.id, p.name, cp.slot_code, p.ovr, p.stats,
           'away' as team
    FROM fm_club_players cp JOIN fm_players p ON p.id = cp.player_id
    WHERE cp.club_id = v_fixture.away_club_id AND cp.role = 'starter'
  LOOP
    -- Map slot codes to positions
    v_slot_x := 50; v_slot_y := 50;
    IF v_player.slot_code = 'GK' THEN v_slot_x := 50; v_slot_y := 92;
    ELSIF v_player.slot_code = 'LB' THEN v_slot_x := 15; v_slot_y := 70;
    ELSIF v_player.slot_code = 'CB1' THEN v_slot_x := 35; v_slot_y := 75;
    ELSIF v_player.slot_code = 'CB2' THEN v_slot_x := 65; v_slot_y := 75;
    ELSIF v_player.slot_code = 'CB3' THEN v_slot_x := 50; v_slot_y := 78;
    ELSIF v_player.slot_code = 'RB' THEN v_slot_x := 85; v_slot_y := 70;
    ELSIF v_player.slot_code = 'LWB' THEN v_slot_x := 10; v_slot_y := 55;
    ELSIF v_player.slot_code = 'RWB' THEN v_slot_x := 90; v_slot_y := 55;
    ELSIF v_player.slot_code = 'CDM1' THEN v_slot_x := 35; v_slot_y := 55;
    ELSIF v_player.slot_code = 'CDM2' THEN v_slot_x := 65; v_slot_y := 55;
    ELSIF v_player.slot_code = 'CM1' THEN v_slot_x := 30; v_slot_y := 50;
    ELSIF v_player.slot_code = 'CM2' THEN v_slot_x := 50; v_slot_y := 55;
    ELSIF v_player.slot_code = 'CM3' THEN v_slot_x := 70; v_slot_y := 50;
    ELSIF v_player.slot_code = 'LM' THEN v_slot_x := 15; v_slot_y := 50;
    ELSIF v_player.slot_code = 'RM' THEN v_slot_x := 85; v_slot_y := 50;
    ELSIF v_player.slot_code = 'CAM' THEN v_slot_x := 50; v_slot_y := 35;
    ELSIF v_player.slot_code = 'LAM' THEN v_slot_x := 25; v_slot_y := 38;
    ELSIF v_player.slot_code = 'RAM' THEN v_slot_x := 75; v_slot_y := 38;
    ELSIF v_player.slot_code = 'LW' THEN v_slot_x := 20; v_slot_y := 25;
    ELSIF v_player.slot_code = 'RW' THEN v_slot_x := 80; v_slot_y := 25;
    ELSIF v_player.slot_code = 'ST' THEN v_slot_x := 50; v_slot_y := 20;
    ELSIF v_player.slot_code = 'ST1' THEN v_slot_x := 35; v_slot_y := 22;
    ELSIF v_player.slot_code = 'ST2' THEN v_slot_x := 65; v_slot_y := 22;
    ELSE v_slot_x := 30 + RANDOM() * 40; v_slot_y := 20 + RANDOM() * 60;
    END IF;

    -- Flip for away team
    IF v_player.team = 'away' THEN
      v_slot_y := 100 - v_slot_y;
    END IF;

    v_player_positions := v_player_positions || jsonb_build_object(
      'playerId', v_player.id,
      'name', v_player.name,
      'team', v_player.team,
      'slot', COALESCE(v_player.slot_code, 'SUB'),
      'position', jsonb_build_object('x', v_slot_x, 'y', v_slot_y),
      'hasBall', false,
      'stats', v_player.stats
    );
  END LOOP;

  -- Attendance
  SELECT COALESCE(fans_count, 5000) INTO v_attendance FROM fm_clubs WHERE id = v_fixture.home_club_id;

  -- Create live match entry
  INSERT INTO fm_live_matches (
    fixture_id, home_club_id, away_club_id, status,
    home_goals, away_goals, current_minute, stoppage_time, half,
    ball_position, player_positions, attendance, started_at
  ) VALUES (
    p_fixture_id, v_fixture.home_club_id, v_fixture.away_club_id, 'live',
    v_home_goals, v_away_goals, 0, 0, 1,
    '{"x": 50, "y": 50}'::jsonb, v_player_positions, v_attendance, NOW()
  ) RETURNING id INTO v_live_match_id;

  -- Insert events into fm_match_events
  INSERT INTO fm_match_events (match_id, minute, event_type, team, description)
  SELECT v_live_match_id, (e->>'minute')::int, e->>'type', e->>'team', e->>'player_name'
  FROM jsonb_array_elements(v_events) e;

  -- Update fixture status to playing
  UPDATE fm_fixtures SET status = 'playing' WHERE id = p_fixture_id;

  -- Reduce player energy
  UPDATE fm_players p
  SET stamina = GREATEST(0, stamina - 15)
  FROM fm_club_players cp
  WHERE p.id = cp.player_id
    AND cp.club_id IN (v_fixture.home_club_id, v_fixture.away_club_id)
    AND cp.role = 'starter';

  -- Send notifications to club owners
  SELECT owner_id INTO v_home_owner FROM fm_clubs WHERE id = v_fixture.home_club_id;
  SELECT owner_id INTO v_away_owner FROM fm_clubs WHERE id = v_fixture.away_club_id;

  IF v_home_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, message, related_type, related_id)
    VALUES (v_home_owner, 'fm_match', '⚽ თქვენი მატჩი დაიწყო! უყურეთ ლაივში', 'fm_live_match', v_live_match_id);
  END IF;
  IF v_away_owner IS NOT NULL THEN
    INSERT INTO notifications (user_id, type, message, related_type, related_id)
    VALUES (v_away_owner, 'fm_match', '⚽ თქვენი მატჩი დაიწყო! უყურეთ ლაივში', 'fm_live_match', v_live_match_id);
  END IF;

  RETURN v_live_match_id;
END;
$$;

-- 2. Function to FINALIZE a live match (Phase 2, after 10 minutes)
CREATE OR REPLACE FUNCTION fm_finalize_live_match(p_live_match_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_live RECORD;
  v_events JSONB;
BEGIN
  SELECT * INTO v_live FROM fm_live_matches WHERE id = p_live_match_id AND status = 'live';
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Update live match to finished
  UPDATE fm_live_matches 
  SET status = 'finished', ended_at = NOW(), current_minute = 90 
  WHERE id = p_live_match_id;

  -- Collect events
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'minute', minute, 'type', event_type, 'team', team, 'player_name', description
  ) ORDER BY minute), '[]'::jsonb)
  INTO v_events
  FROM fm_match_events WHERE match_id = p_live_match_id;

  -- Insert match result — this triggers fm_update_standings_after_match
  INSERT INTO fm_match_results (fixture_id, home_goals, away_goals, events, stats)
  VALUES (
    v_live.fixture_id,
    v_live.home_goals,
    v_live.away_goals,
    v_events,
    jsonb_build_object('live_match_id', p_live_match_id)
  );

  RETURN TRUE;
END;
$$;

-- 3. Update fm_play_daily_matches for two-phase processing
CREATE OR REPLACE FUNCTION fm_play_daily_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture RECORD;
  v_live RECORD;
  v_processed INTEGER := 0;
BEGIN
  -- Phase 1: Start pending matches whose time has come
  FOR v_fixture IN
    SELECT f.id
    FROM fm_fixtures f
    JOIN fm_leagues l ON l.id = f.league_id
    WHERE f.status = 'pending'
      AND l.status = 'active'
      AND f.scheduled_date <= NOW()
    ORDER BY f.scheduled_date
    LIMIT 10
  LOOP
    PERFORM fm_start_live_match(v_fixture.id);
    v_processed := v_processed + 1;
  END LOOP;

  -- Phase 2: Finalize live matches that have run for 10+ minutes
  FOR v_live IN
    SELECT lm.id
    FROM fm_live_matches lm
    WHERE lm.status = 'live'
      AND lm.started_at + INTERVAL '10 minutes' <= NOW()
    LIMIT 10
  LOOP
    PERFORM fm_finalize_live_match(v_live.id);
    v_processed := v_processed + 1;
  END LOOP;

  -- Check if any league is finished (no pending OR playing fixtures)
  UPDATE fm_leagues l
  SET status = 'finished', updated_at = NOW()
  WHERE l.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM fm_fixtures f
      WHERE f.league_id = l.id AND f.status IN ('pending', 'playing')
    );

  RETURN v_processed;
END;
$$;

-- 4. Update standings trigger to check for 'playing' status too
CREATE OR REPLACE FUNCTION fm_update_standings_after_match()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_league_id UUID;
    v_home_club_id UUID;
    v_away_club_id UUID;
    v_result TEXT;
BEGIN
    -- Get fixture info
    SELECT league_id, home_club_id, away_club_id
    INTO v_league_id, v_home_club_id, v_away_club_id
    FROM public.fm_fixtures WHERE id = NEW.fixture_id;

    -- Determine result for home team
    IF NEW.home_goals > NEW.away_goals THEN
        v_result := 'W';
    ELSIF NEW.home_goals < NEW.away_goals THEN
        v_result := 'L';
    ELSE
        v_result := 'D';
    END IF;

    -- Update home team standings
    INSERT INTO public.fm_standings (league_id, club_id, played, wins, draws, losses, gf, ga, gd, points, last5)
    VALUES (
        v_league_id, v_home_club_id, 1,
        CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        NEW.home_goals, NEW.away_goals, NEW.home_goals - NEW.away_goals,
        CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        ARRAY[v_result]
    )
    ON CONFLICT (league_id, club_id) DO UPDATE SET
        played = fm_standings.played + 1,
        wins = fm_standings.wins + CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        draws = fm_standings.draws + CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        losses = fm_standings.losses + CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        gf = fm_standings.gf + NEW.home_goals,
        ga = fm_standings.ga + NEW.away_goals,
        gd = fm_standings.gd + (NEW.home_goals - NEW.away_goals),
        points = fm_standings.points + CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        last5 = (ARRAY[v_result] || fm_standings.last5)[1:5],
        updated_at = now();

    -- Determine result for away team (inverse)
    IF NEW.away_goals > NEW.home_goals THEN
        v_result := 'W';
    ELSIF NEW.away_goals < NEW.home_goals THEN
        v_result := 'L';
    ELSE
        v_result := 'D';
    END IF;

    -- Update away team standings
    INSERT INTO public.fm_standings (league_id, club_id, played, wins, draws, losses, gf, ga, gd, points, last5)
    VALUES (
        v_league_id, v_away_club_id, 1,
        CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        NEW.away_goals, NEW.home_goals, NEW.away_goals - NEW.home_goals,
        CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        ARRAY[v_result]
    )
    ON CONFLICT (league_id, club_id) DO UPDATE SET
        played = fm_standings.played + 1,
        wins = fm_standings.wins + CASE WHEN v_result = 'W' THEN 1 ELSE 0 END,
        draws = fm_standings.draws + CASE WHEN v_result = 'D' THEN 1 ELSE 0 END,
        losses = fm_standings.losses + CASE WHEN v_result = 'L' THEN 1 ELSE 0 END,
        gf = fm_standings.gf + NEW.away_goals,
        ga = fm_standings.ga + NEW.home_goals,
        gd = fm_standings.gd + (NEW.away_goals - NEW.home_goals),
        points = fm_standings.points + CASE WHEN v_result = 'W' THEN 3 WHEN v_result = 'D' THEN 1 ELSE 0 END,
        last5 = (ARRAY[v_result] || fm_standings.last5)[1:5],
        updated_at = now();

    -- Update fixture status
    UPDATE public.fm_fixtures SET status = 'played' WHERE id = NEW.fixture_id;

    -- Check if league is finished (include 'playing' in check)
    IF NOT EXISTS (
      SELECT 1 FROM public.fm_fixtures 
      WHERE league_id = v_league_id AND status IN ('pending', 'playing')
    ) THEN
        UPDATE public.fm_leagues SET status = 'finished', updated_at = now() WHERE id = v_league_id;
    END IF;

    RETURN NEW;
END;
$$;
