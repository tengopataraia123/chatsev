
-- Fix video_views RLS policies to be more restrictive
DROP POLICY IF EXISTS "Anyone can insert video views" ON public.video_views;
DROP POLICY IF EXISTS "Anyone can update video views" ON public.video_views;

-- More restrictive policies for video_views
CREATE POLICY "Authenticated or anonymous can insert video views" 
ON public.video_views FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND user_id IS NULL AND session_id IS NOT NULL)
);

CREATE POLICY "Users can update their own video views" 
ON public.video_views FOR UPDATE 
USING (
  (auth.uid() IS NOT NULL AND user_id = auth.uid())
  OR (auth.uid() IS NULL AND session_id IS NOT NULL)
);
