-- Seed coaches data
INSERT INTO public.fm_coaches (name, nation, style, level, bonuses, price, salary) VALUES
('ხვიჩა მჭედლიშვილი', 'GE', 'attacking', 85, '{"training_boost": 15, "morale_boost": 10, "tactical_boost": 20}', 5000000, 50000),
('გიორგი დავითაშვილი', 'GE', 'balanced', 78, '{"training_boost": 12, "morale_boost": 15, "tactical_boost": 12}', 3500000, 35000),
('ლევან კობიაშვილი', 'GE', 'defensive', 82, '{"training_boost": 10, "morale_boost": 8, "tactical_boost": 18}', 4200000, 42000),
('თემურ კეცბაია', 'GE', 'counter', 88, '{"training_boost": 18, "morale_boost": 12, "tactical_boost": 22}', 6000000, 60000),
('კახა კალაძე', 'GE', 'possession', 80, '{"training_boost": 14, "morale_boost": 20, "tactical_boost": 15}', 4000000, 40000),
('ჟოზე მორინიო', 'PT', 'defensive', 92, '{"training_boost": 20, "morale_boost": 25, "tactical_boost": 28}', 15000000, 150000),
('პეპ გვარდიოლა', 'ES', 'possession', 95, '{"training_boost": 25, "morale_boost": 22, "tactical_boost": 30}', 20000000, 200000),
('კარლო ანჩელოტი', 'IT', 'balanced', 90, '{"training_boost": 18, "morale_boost": 28, "tactical_boost": 25}', 12000000, 120000),
('იურგენ კლოპი', 'DE', 'attacking', 91, '{"training_boost": 22, "morale_boost": 30, "tactical_boost": 26}', 14000000, 140000),
('ზინედინ ზიდანი', 'FR', 'balanced', 89, '{"training_boost": 20, "morale_boost": 25, "tactical_boost": 24}', 11000000, 110000);

-- Seed players data - Goalkeepers
INSERT INTO public.fm_players (name, age, nation, position, secondary_position, ovr, stats, stamina, form, potential, foot, price, salary) VALUES
('გიორგი ლორია', 28, 'GE', 'GK', NULL, 78, '{"pace": 45, "shooting": 20, "passing": 55, "dribbling": 35, "defending": 30, "physical": 75}', 100, 0, 82, 'right', 3500000, 35000),
('რატი მამარდაშვილი', 23, 'GE', 'GK', NULL, 82, '{"pace": 48, "shooting": 18, "passing": 58, "dribbling": 38, "defending": 32, "physical": 78}', 100, 2, 88, 'right', 8000000, 80000),
('ნიკა მამარაშვილი', 25, 'GE', 'GK', NULL, 75, '{"pace": 42, "shooting": 15, "passing": 52, "dribbling": 32, "defending": 28, "physical": 72}', 100, 0, 78, 'right', 2500000, 25000),
('ალბან ლაფონი', 25, 'FR', 'GK', NULL, 80, '{"pace": 50, "shooting": 22, "passing": 60, "dribbling": 40, "defending": 35, "physical": 76}', 100, 1, 84, 'right', 5000000, 50000),
('თიბო კურტუა', 31, 'BE', 'GK', NULL, 89, '{"pace": 52, "shooting": 25, "passing": 65, "dribbling": 42, "defending": 38, "physical": 82}', 100, 2, 89, 'left', 25000000, 250000),
('ალისონ ბეკერი', 31, 'BR', 'GK', NULL, 90, '{"pace": 55, "shooting": 28, "passing": 70, "dribbling": 45, "defending": 40, "physical": 85}', 100, 3, 90, 'right', 30000000, 300000);

-- Seed players data - Defenders
INSERT INTO public.fm_players (name, age, nation, position, secondary_position, ovr, stats, stamina, form, potential, foot, price, salary) VALUES
('გურამ კაშია', 36, 'GE', 'DEF', NULL, 76, '{"pace": 55, "shooting": 35, "passing": 58, "dribbling": 45, "defending": 82, "physical": 78}', 100, 0, 76, 'right', 1500000, 15000),
('სოლომონ კვირკველია', 31, 'GE', 'DEF', NULL, 79, '{"pace": 62, "shooting": 38, "passing": 55, "dribbling": 48, "defending": 80, "physical": 82}', 100, 1, 79, 'right', 4000000, 40000),
('ჯემალ თაბიძე', 28, 'GE', 'DEF', NULL, 74, '{"pace": 58, "shooting": 32, "passing": 52, "dribbling": 42, "defending": 75, "physical": 76}', 100, 0, 78, 'right', 2000000, 20000),
('ლაშა დვალი', 30, 'GE', 'DEF', 'MID', 77, '{"pace": 60, "shooting": 40, "passing": 62, "dribbling": 50, "defending": 78, "physical": 75}', 100, 1, 77, 'left', 3000000, 30000),
('ოთარ კაკაბაძე', 29, 'GE', 'DEF', NULL, 75, '{"pace": 72, "shooting": 42, "passing": 58, "dribbling": 55, "defending": 72, "physical": 70}', 100, 0, 76, 'right', 2500000, 25000),
('ვირხილ ვან დაიკი', 32, 'NL', 'DEF', NULL, 89, '{"pace": 78, "shooting": 55, "passing": 72, "dribbling": 58, "defending": 92, "physical": 88}', 100, 2, 89, 'right', 45000000, 450000),
('რიუბენ დიაში', 26, 'PT', 'DEF', NULL, 86, '{"pace": 72, "shooting": 45, "passing": 68, "dribbling": 52, "defending": 88, "physical": 85}', 100, 2, 90, 'right', 35000000, 350000),
('ჟულ კუნდე', 25, 'FR', 'DEF', NULL, 84, '{"pace": 85, "shooting": 48, "passing": 65, "dribbling": 58, "defending": 84, "physical": 78}', 100, 1, 88, 'right', 28000000, 280000),
('ალფონსო დევისი', 23, 'CA', 'DEF', 'MID', 83, '{"pace": 95, "shooting": 52, "passing": 70, "dribbling": 78, "defending": 75, "physical": 72}', 100, 2, 90, 'left', 30000000, 300000),
('თრენტ ალექსანდერ-არნოლდი', 25, 'EN', 'DEF', 'MID', 87, '{"pace": 78, "shooting": 68, "passing": 88, "dribbling": 75, "defending": 72, "physical": 70}', 100, 2, 91, 'right', 40000000, 400000),
('ანტონიო რიუდიგერი', 30, 'DE', 'DEF', NULL, 85, '{"pace": 82, "shooting": 48, "passing": 62, "dribbling": 55, "defending": 86, "physical": 88}', 100, 1, 85, 'left', 32000000, 320000),
('მარკინიოში', 29, 'BR', 'DEF', 'MID', 86, '{"pace": 75, "shooting": 50, "passing": 72, "dribbling": 65, "defending": 87, "physical": 82}', 100, 1, 86, 'right', 38000000, 380000);

-- Seed players data - Midfielders  
INSERT INTO public.fm_players (name, age, nation, position, secondary_position, ovr, stats, stamina, form, potential, foot, price, salary) VALUES
('ხვიჩა კვარაცხელია', 23, 'GE', 'MID', 'FWD', 86, '{"pace": 88, "shooting": 78, "passing": 82, "dribbling": 92, "defending": 35, "physical": 68}', 100, 3, 93, 'right', 80000000, 800000),
('გიორგი ჩაკვეტაძე', 25, 'GE', 'MID', NULL, 78, '{"pace": 75, "shooting": 68, "passing": 78, "dribbling": 82, "defending": 42, "physical": 62}', 100, 1, 83, 'right', 12000000, 120000),
('ზურაბ დავითაშვილი', 23, 'GE', 'MID', 'FWD', 77, '{"pace": 82, "shooting": 65, "passing": 70, "dribbling": 78, "defending": 38, "physical": 65}', 100, 2, 85, 'right', 8000000, 80000),
('სანდრო ალტუნაშვილი', 22, 'GE', 'MID', NULL, 72, '{"pace": 70, "shooting": 58, "passing": 72, "dribbling": 68, "defending": 55, "physical": 65}', 100, 0, 80, 'right', 3500000, 35000),
('ვალერიან გვილია', 30, 'GE', 'MID', NULL, 74, '{"pace": 65, "shooting": 55, "passing": 75, "dribbling": 65, "defending": 72, "physical": 78}', 100, 0, 74, 'right', 2000000, 20000),
('ქევინ დე ბრაინე', 32, 'BE', 'MID', NULL, 91, '{"pace": 75, "shooting": 88, "passing": 95, "dribbling": 85, "defending": 58, "physical": 72}', 100, 2, 91, 'right', 55000000, 550000),
('ჟუდე ბელინგემი', 20, 'EN', 'MID', 'FWD', 89, '{"pace": 80, "shooting": 82, "passing": 85, "dribbling": 88, "defending": 65, "physical": 78}', 100, 3, 95, 'right', 120000000, 1200000),
('ფლორიან ვირცი', 20, 'DE', 'MID', 'FWD', 85, '{"pace": 78, "shooting": 78, "passing": 82, "dribbling": 88, "defending": 42, "physical": 62}', 100, 2, 93, 'right', 75000000, 750000),
('პედრი', 21, 'ES', 'MID', NULL, 87, '{"pace": 72, "shooting": 70, "passing": 88, "dribbling": 90, "defending": 62, "physical": 65}', 100, 2, 94, 'right', 90000000, 900000),
('ფედე ვალვერდე', 25, 'UY', 'MID', NULL, 88, '{"pace": 88, "shooting": 82, "passing": 80, "dribbling": 82, "defending": 75, "physical": 85}', 100, 2, 91, 'right', 85000000, 850000),
('ჯამალ მუსიალა', 21, 'DE', 'MID', 'FWD', 86, '{"pace": 80, "shooting": 75, "passing": 82, "dribbling": 92, "defending": 38, "physical": 60}', 100, 3, 94, 'right', 100000000, 1000000),
('ვინისიუს ჟუნიორი', 23, 'BR', 'MID', 'FWD', 89, '{"pace": 95, "shooting": 80, "passing": 78, "dribbling": 92, "defending": 32, "physical": 68}', 100, 3, 93, 'right', 150000000, 1500000);

-- Seed players data - Forwards
INSERT INTO public.fm_players (name, age, nation, position, secondary_position, ovr, stats, stamina, form, potential, foot, price, salary) VALUES
('გიორგი მიქაუტაძე', 23, 'GE', 'FWD', NULL, 79, '{"pace": 82, "shooting": 82, "passing": 65, "dribbling": 75, "defending": 28, "physical": 72}', 100, 2, 86, 'right', 25000000, 250000),
('ბუდუ ზივზივაძე', 29, 'GE', 'FWD', NULL, 74, '{"pace": 78, "shooting": 75, "passing": 58, "dribbling": 68, "defending": 25, "physical": 75}', 100, 0, 74, 'right', 3500000, 35000),
('სანდრო კურცანიძე', 22, 'GE', 'FWD', 'MID', 71, '{"pace": 80, "shooting": 68, "passing": 55, "dribbling": 72, "defending": 22, "physical": 68}', 100, 1, 80, 'right', 2500000, 25000),
('ერლინგ ჰაალანდი', 23, 'NO', 'FWD', NULL, 91, '{"pace": 90, "shooting": 95, "passing": 65, "dribbling": 78, "defending": 45, "physical": 92}', 100, 3, 95, 'left', 180000000, 1800000),
('კილიან მბაპე', 25, 'FR', 'FWD', 'MID', 91, '{"pace": 98, "shooting": 90, "passing": 78, "dribbling": 92, "defending": 35, "physical": 78}', 100, 3, 95, 'right', 180000000, 1800000),
('ჰარი კეინი', 30, 'EN', 'FWD', NULL, 89, '{"pace": 70, "shooting": 92, "passing": 85, "dribbling": 80, "defending": 52, "physical": 82}', 100, 2, 89, 'right', 100000000, 1000000),
('ვიქტორ ოსიმენი', 25, 'NG', 'FWD', NULL, 87, '{"pace": 90, "shooting": 85, "passing": 62, "dribbling": 78, "defending": 38, "physical": 85}', 100, 2, 91, 'right', 120000000, 1200000),
('ლაუტარო მარტინესი', 26, 'AR', 'FWD', NULL, 86, '{"pace": 82, "shooting": 85, "passing": 70, "dribbling": 82, "defending": 42, "physical": 78}', 100, 2, 88, 'right', 85000000, 850000)
ON CONFLICT DO NOTHING;

-- Function to generate double round robin fixtures
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
  v_rotated UUID[];
BEGIN
  -- Get league info
  SELECT start_date::date, matches_per_day INTO v_start_date, v_matches_per_day
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

-- Function to simulate a match
CREATE OR REPLACE FUNCTION public.fm_simulate_match(p_fixture_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture RECORD;
  v_home_ovr NUMERIC;
  v_away_ovr NUMERIC;
  v_home_coach_bonus NUMERIC := 0;
  v_away_coach_bonus NUMERIC := 0;
  v_home_energy NUMERIC;
  v_away_energy NUMERIC;
  v_home_goals INTEGER;
  v_away_goals INTEGER;
  v_home_prob NUMERIC;
  v_random NUMERIC;
  v_events JSONB := '[]'::jsonb;
  v_result_id UUID;
BEGIN
  -- Get fixture
  SELECT * INTO v_fixture FROM fm_fixtures WHERE id = p_fixture_id AND status = 'pending';
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Fixture not found or already played');
  END IF;
  
  -- Calculate home team strength
  SELECT COALESCE(AVG(p.ovr), 60), COALESCE(AVG(p.stamina), 70)
  INTO v_home_ovr, v_home_energy
  FROM fm_club_players cp
  JOIN fm_players p ON p.id = cp.player_id
  WHERE cp.club_id = v_fixture.home_club_id AND cp.role = 'starter';
  
  -- Get home coach bonus
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
  
  -- Get away coach bonus
  SELECT COALESCE((c.bonuses->>'tactical_boost')::numeric, 0) INTO v_away_coach_bonus
  FROM fm_club_coach cc
  JOIN fm_coaches c ON c.id = cc.coach_id
  WHERE cc.club_id = v_fixture.away_club_id;
  
  -- Apply bonuses (home advantage + coach + energy)
  v_home_ovr := v_home_ovr + 5 + (v_home_coach_bonus / 5) + ((v_home_energy - 70) / 10);
  v_away_ovr := v_away_ovr + (v_away_coach_bonus / 5) + ((v_away_energy - 70) / 10);
  
  -- Calculate win probability
  v_home_prob := v_home_ovr / (v_home_ovr + v_away_ovr);
  
  -- Generate goals based on team strength
  v_home_goals := FLOOR(RANDOM() * 4 * (v_home_prob + 0.2));
  v_away_goals := FLOOR(RANDOM() * 4 * ((1 - v_home_prob) + 0.2));
  
  -- Generate match events
  FOR i IN 1..v_home_goals LOOP
    v_events := v_events || jsonb_build_object(
      'minute', FLOOR(RANDOM() * 90) + 1,
      'type', 'goal',
      'team', 'home',
      'player_name', 'Home Player'
    );
  END LOOP;
  
  FOR i IN 1..v_away_goals LOOP
    v_events := v_events || jsonb_build_object(
      'minute', FLOOR(RANDOM() * 90) + 1,
      'type', 'goal',
      'team', 'away',
      'player_name', 'Away Player'
    );
  END LOOP;
  
  -- Insert match result
  INSERT INTO fm_match_results (fixture_id, home_goals, away_goals, events, stats)
  VALUES (p_fixture_id, v_home_goals, v_away_goals, v_events, jsonb_build_object(
    'home_ovr', v_home_ovr,
    'away_ovr', v_away_ovr,
    'home_energy', v_home_energy,
    'away_energy', v_away_energy
  ))
  RETURNING id INTO v_result_id;
  
  -- Update fixture status
  UPDATE fm_fixtures SET status = 'played' WHERE id = p_fixture_id;
  
  -- Reduce player energy after match
  UPDATE fm_players p
  SET stamina = GREATEST(0, stamina - 15)
  FROM fm_club_players cp
  WHERE p.id = cp.player_id 
    AND cp.club_id IN (v_fixture.home_club_id, v_fixture.away_club_id)
    AND cp.role = 'starter';
  
  RETURN jsonb_build_object(
    'fixture_id', p_fixture_id,
    'home_goals', v_home_goals,
    'away_goals', v_away_goals,
    'result_id', v_result_id
  );
END;
$$;

-- Function to play today's matches
CREATE OR REPLACE FUNCTION public.fm_play_daily_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture RECORD;
  v_played INTEGER := 0;
  v_max_per_day INTEGER := 3;
BEGIN
  FOR v_fixture IN 
    SELECT f.id 
    FROM fm_fixtures f
    JOIN fm_leagues l ON l.id = f.league_id
    WHERE f.status = 'pending' 
      AND l.status = 'active'
      AND f.scheduled_date <= CURRENT_DATE
    ORDER BY f.scheduled_date, f.round, f.match_day
    LIMIT v_max_per_day
  LOOP
    PERFORM fm_simulate_match(v_fixture.id);
    v_played := v_played + 1;
  END LOOP;
  
  -- Check if any league is finished
  UPDATE fm_leagues l
  SET status = 'finished'
  WHERE l.status = 'active'
    AND NOT EXISTS (
      SELECT 1 FROM fm_fixtures f 
      WHERE f.league_id = l.id AND f.status = 'pending'
    );
  
  RETURN v_played;
END;
$$;

-- Initialize standings when team joins league
CREATE OR REPLACE FUNCTION public.fm_init_standing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO fm_standings (league_id, club_id, played, wins, draws, losses, gf, ga, gd, points, last5)
  VALUES (NEW.league_id, NEW.club_id, 0, 0, 0, 0, 0, 0, 0, 0, '{}')
  ON CONFLICT (league_id, club_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fm_init_standing ON fm_league_members;
CREATE TRIGGER trg_fm_init_standing
  AFTER INSERT ON fm_league_members
  FOR EACH ROW
  EXECUTE FUNCTION fm_init_standing();

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.fm_generate_fixtures(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fm_simulate_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fm_play_daily_matches() TO authenticated;