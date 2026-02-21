-- Fix award_points function to accept TEXT for reference_id
CREATE OR REPLACE FUNCTION public.award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_action_type TEXT,
  p_description TEXT DEFAULT NULL,
  p_reference_id TEXT DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_total INTEGER;
  v_new_level INTEGER;
  v_current_level INTEGER;
BEGIN
  INSERT INTO public.user_gamification (user_id, total_points, experience_points)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE SET
    total_points = user_gamification.total_points + p_points,
    experience_points = user_gamification.experience_points + p_points,
    updated_at = now()
  RETURNING total_points, current_level INTO v_new_total, v_current_level;
  
  v_new_level := GREATEST(1, (v_new_total / 1000) + 1);
  
  IF v_new_level > v_current_level THEN
    UPDATE public.user_gamification SET current_level = v_new_level WHERE user_id = p_user_id;
  END IF;
  
  INSERT INTO public.points_history (user_id, points, action_type, description, reference_id)
  VALUES (p_user_id, p_points, p_action_type, p_description, p_reference_id::UUID);
  
  RETURN v_new_total;
END;
$$;