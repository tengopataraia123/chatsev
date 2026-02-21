-- Create photo_views table to track photo views
CREATE TABLE IF NOT EXISTS public.photo_views (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  photo_id TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('post', 'avatar', 'cover')),
  user_id UUID,
  viewed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_photo_views_photo_id ON public.photo_views (photo_id, photo_type);
CREATE INDEX idx_photo_views_user_id ON public.photo_views (user_id);

-- Enable Row Level Security
ALTER TABLE public.photo_views ENABLE ROW LEVEL SECURITY;

-- Allow everyone to view and insert photo views
CREATE POLICY "Anyone can view photo views" 
ON public.photo_views 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can record photo view" 
ON public.photo_views 
FOR INSERT 
WITH CHECK (true);

-- Enable realtime for photo_views
ALTER PUBLICATION supabase_realtime ADD TABLE public.photo_views;