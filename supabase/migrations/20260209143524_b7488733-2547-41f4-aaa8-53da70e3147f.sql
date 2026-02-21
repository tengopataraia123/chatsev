-- Fix: When start_date is NULL, use CURRENT_DATE
CREATE OR REPLACE FUNCTION public.fm_generate_fixtures(p_league_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_teams UUID[];
  v_team_count INTEGER;
  v_matches_per_day INTEGER;
  v_start_date DATE;
  v_current_date DATE;
  v_match_day INTEGER := 1;
  v_round INTEGER := 1;
  v_fixture_count INTEGER := 0;
  v_home_idx INTEGER;
  v_away_idx INTEGER;
  v_temp UUID;
BEGIN
  -- Get league info
  SELECT COALESCE(start_date::date, CURRENT_DATE), matches_per_day INTO v_start_date, v_matches_per_day
  FROM fm_leagues WHERE id = p_league_id;
  
  -- Get teams in random order
  SELECT ARRAY_AGG(club_id ORDER BY RANDOM()) INTO v_teams
  FROM fm_league_members WHERE league_id = p_league_id;
  
  v_team_count := array_length(v_teams, 1);
  
  IF v_team_count IS NULL OR v_team_count < 2 THEN
    RETURN 0;
  END IF;
  
  v_current_date := v_start_date;
  
  -- Delete existing fixtures
  DELETE FROM fm_fixtures WHERE league_id = p_league_id;
  
  -- Generate round robin (first half - home games)
  FOR v_round IN 1..(v_team_count - 1) LOOP
    FOR v_home_idx IN 1..(v_team_count / 2) LOOP
      v_away_idx := v_team_count - v_home_idx + 1;
      
      IF v_teams[v_home_idx] IS NOT NULL AND v_teams[v_away_idx] IS NOT NULL THEN
        INSERT INTO fm_fixtures (league_id, round, match_day, home_club_id, away_club_id, scheduled_date, status)
        VALUES (p_league_id, v_round, v_match_day, v_teams[v_home_idx], v_teams[v_away_idx], v_current_date, 'pending');
        v_fixture_count := v_fixture_count + 1;
        
        IF v_fixture_count % v_matches_per_day = 0 THEN
          v_current_date := v_current_date + 1;
          v_match_day := v_match_day + 1;
        END IF;
      END IF;
    END LOOP;
    
    -- Rotate teams (keep first fixed)
    v_temp := v_teams[2];
    FOR v_home_idx IN 2..(v_team_count - 1) LOOP
      v_teams[v_home_idx] := v_teams[v_home_idx + 1];
    END LOOP;
    v_teams[v_team_count] := v_temp;
  END LOOP;
  
  -- Generate reverse fixtures (second half - away games)
  INSERT INTO fm_fixtures (league_id, round, match_day, home_club_id, away_club_id, scheduled_date, status)
  SELECT 
    league_id,
    round + (v_team_count - 1),
    match_day + v_match_day,
    away_club_id,
    home_club_id,
    scheduled_date + (v_match_day * INTERVAL '1 day'),
    'pending'
  FROM fm_fixtures 
  WHERE league_id = p_league_id AND round <= (v_team_count - 1);
  
  -- Update league status
  UPDATE fm_leagues SET status = 'active' WHERE id = p_league_id;
  
  RETURN v_fixture_count * 2;
END;
$$;

-- Also fix fm_play_daily_matches to handle scheduled_date properly
-- Update existing NULL scheduled_date fixtures to today
UPDATE fm_fixtures SET scheduled_date = CURRENT_DATE WHERE scheduled_date IS NULL AND status = 'pending';