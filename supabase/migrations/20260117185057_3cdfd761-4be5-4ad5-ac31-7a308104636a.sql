
-- Fix videos table RLS policies for all admin roles
DROP POLICY IF EXISTS "Admins can delete any video" ON public.videos;
DROP POLICY IF EXISTS "Admins can update any video" ON public.videos;
DROP POLICY IF EXISTS "Admins can view all videos" ON public.videos;
DROP POLICY IF EXISTS "Admins can manage all videos" ON public.videos;

CREATE POLICY "Admins can manage all videos"
ON public.videos
FOR ALL
TO authenticated
USING (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
)
WITH CHECK (
  has_role(auth.uid(), 'super_admin'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'moderator'::app_role)
);
