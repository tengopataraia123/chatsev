-- Add RLS policy for users to view broadcasts they are recipients of
CREATE POLICY "Users can view broadcasts they received" 
ON public.system_broadcasts 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.system_broadcast_recipients 
    WHERE broadcast_id = system_broadcasts.id 
    AND user_id = auth.uid()
  )
);