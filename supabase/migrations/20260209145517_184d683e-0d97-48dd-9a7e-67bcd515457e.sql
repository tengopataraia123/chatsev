CREATE OR REPLACE FUNCTION public.fm_play_daily_matches()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_fixture RECORD;
  v_played INTEGER := 0;
  v_max_per_day INTEGER := 10;
BEGIN
  FOR v_fixture IN 
    SELECT f.id 
    FROM fm_fixtures f
    JOIN fm_leagues l ON l.id = f.league_id
    WHERE f.status = 'pending' 
      AND l.status = 'active'
      AND f.scheduled_date <= NOW()
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