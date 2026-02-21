
-- Change start_date from date to timestamptz for precise time control
ALTER TABLE fm_leagues ALTER COLUMN start_date TYPE timestamp with time zone USING start_date::timestamp with time zone;

-- Rewrite fixture generation: proper double round-robin, distributed over 12 hours
CREATE OR REPLACE FUNCTION public.fm_generate_fixtures(p_league_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teams UUID[];
  v_team_count INTEGER;
  v_start_time TIMESTAMPTZ;
  v_total_matches INTEGER;
  v_interval_minutes DOUBLE PRECISION;
  v_fixture_index INTEGER := 0;
  v_round INTEGER;
  v_i INTEGER;
  v_home_idx INTEGER;
  v_away_idx INTEGER;
  v_temp UUID;
  v_match_time TIMESTAMPTZ;
  v_rotated UUID[];
BEGIN
  -- Get league start time
  SELECT COALESCE(start_date, now()) INTO v_start_time
  FROM fm_leagues WHERE id = p_league_id;
  
  -- Get teams in random order
  SELECT ARRAY_AGG(club_id ORDER BY RANDOM()) INTO v_teams
  FROM fm_league_members WHERE league_id = p_league_id;
  
  v_team_count := array_length(v_teams, 1);
  
  IF v_team_count IS NULL OR v_team_count < 2 THEN
    RETURN 0;
  END IF;
  
  -- Total matches in double round-robin = N * (N-1)
  v_total_matches := v_team_count * (v_team_count - 1);
  
  -- Distribute evenly over 12 hours (720 minutes)
  v_interval_minutes := 720.0 / v_total_matches;
  
  -- Delete existing fixtures
  DELETE FROM fm_fixtures WHERE league_id = p_league_id;
  DELETE FROM fm_standings WHERE league_id = p_league_id;
  
  -- Copy teams array for rotation
  v_rotated := v_teams;
  
  -- === FIRST HALF: rounds 1..(N-1) ===
  FOR v_round IN 1..(v_team_count - 1) LOOP
    FOR v_i IN 1..(v_team_count / 2) LOOP
      v_home_idx := v_i;
      v_away_idx := v_team_count - v_i + 1;
      
      v_match_time := v_start_time + (v_fixture_index * v_interval_minutes * INTERVAL '1 minute');
      
      INSERT INTO fm_fixtures (league_id, round, match_day, home_club_id, away_club_id, scheduled_date, status)
      VALUES (p_league_id, v_round, v_fixture_index + 1, v_rotated[v_home_idx], v_rotated[v_away_idx], v_match_time, 'pending');
      
      v_fixture_index := v_fixture_index + 1;
    END LOOP;
    
    -- Rotate: keep first element fixed, rotate rest
    v_temp := v_rotated[2];
    FOR v_i IN 2..(v_team_count - 1) LOOP
      v_rotated[v_i] := v_rotated[v_i + 1];
    END LOOP;
    v_rotated[v_team_count] := v_temp;
  END LOOP;
  
  -- === SECOND HALF: reverse home/away ===
  v_rotated := v_teams; -- reset rotation
  
  FOR v_round IN 1..(v_team_count - 1) LOOP
    FOR v_i IN 1..(v_team_count / 2) LOOP
      v_home_idx := v_i;
      v_away_idx := v_team_count - v_i + 1;
      
      v_match_time := v_start_time + (v_fixture_index * v_interval_minutes * INTERVAL '1 minute');
      
      -- Reversed home/away
      INSERT INTO fm_fixtures (league_id, round, match_day, home_club_id, away_club_id, scheduled_date, status)
      VALUES (p_league_id, v_round + (v_team_count - 1), v_fixture_index + 1, v_rotated[v_away_idx], v_rotated[v_home_idx], v_match_time, 'pending');
      
      v_fixture_index := v_fixture_index + 1;
    END LOOP;
    
    -- Same rotation
    v_temp := v_rotated[2];
    FOR v_i IN 2..(v_team_count - 1) LOOP
      v_rotated[v_i] := v_rotated[v_i + 1];
    END LOOP;
    v_rotated[v_team_count] := v_temp;
  END LOOP;
  
  -- Initialize standings for all teams
  INSERT INTO fm_standings (league_id, club_id, played, wins, draws, losses, gf, ga, gd, points, last5)
  SELECT p_league_id, unnest(v_teams), 0, 0, 0, 0, 0, 0, 0, 0, ARRAY[]::text[];
  
  -- Update league status to active
  UPDATE fm_leagues SET status = 'active' WHERE id = p_league_id;
  
  RETURN v_fixture_index;
END;
$$;
