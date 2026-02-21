-- Fix RLS policies to use correct parameter order for has_role function

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage categories" ON public.gif_categories;
DROP POLICY IF EXISTS "Admins can manage gifs" ON public.gifs;

-- Create new policies with correct parameter order
CREATE POLICY "Admins can manage categories" 
ON public.gif_categories 
FOR ALL 
USING (public.has_role('admin'::app_role, auth.uid()))
WITH CHECK (public.has_role('admin'::app_role, auth.uid()));

CREATE POLICY "Admins can manage gifs" 
ON public.gifs 
FOR ALL 
USING (public.has_role('admin'::app_role, auth.uid()))
WITH CHECK (public.has_role('admin'::app_role, auth.uid()));