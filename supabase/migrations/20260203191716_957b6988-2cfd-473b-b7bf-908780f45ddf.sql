-- Add display_name_style and message_style JSON columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS display_name_style JSONB DEFAULT '{"fontFamily": "inherit", "fontSize": 16, "color": null, "bold": false, "italic": false, "underline": false}'::jsonb,
ADD COLUMN IF NOT EXISTS message_style JSONB DEFAULT '{"fontFamily": "inherit", "fontSize": 14, "color": null, "bold": false, "italic": false, "lineHeight": 1.5}'::jsonb;

-- Create user_gallery table for photo gallery
CREATE TABLE IF NOT EXISTS public.user_gallery (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  image_url TEXT NOT NULL,
  privacy TEXT DEFAULT 'public' CHECK (privacy IN ('public', 'friends', 'private')),
  caption TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_gallery_user_id ON public.user_gallery(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gallery_created_at ON public.user_gallery(created_at DESC);

-- Enable RLS on user_gallery
ALTER TABLE public.user_gallery ENABLE ROW LEVEL SECURITY;

-- Gallery policies
CREATE POLICY "Users can view public gallery photos" 
ON public.user_gallery FOR SELECT 
USING (
  privacy = 'public' 
  OR user_id = auth.uid()
  OR (privacy = 'friends' AND EXISTS (
    SELECT 1 FROM public.friendships 
    WHERE status = 'accepted' 
    AND ((requester_id = auth.uid() AND addressee_id = user_gallery.user_id)
         OR (addressee_id = auth.uid() AND requester_id = user_gallery.user_id))
  ))
);

CREATE POLICY "Users can insert own gallery photos" 
ON public.user_gallery FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own gallery photos" 
ON public.user_gallery FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own gallery photos" 
ON public.user_gallery FOR DELETE 
USING (user_id = auth.uid());

-- Enable realtime for gallery
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_gallery;