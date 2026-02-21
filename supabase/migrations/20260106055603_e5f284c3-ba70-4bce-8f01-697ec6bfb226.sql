-- Create table for username styles
CREATE TABLE public.username_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  text_color TEXT DEFAULT '#ffffff',
  gradient_start TEXT,
  gradient_end TEXT,
  use_gradient BOOLEAN DEFAULT false,
  font_weight TEXT DEFAULT 'normal',
  font_style TEXT DEFAULT 'normal',
  text_decoration TEXT DEFAULT 'none',
  text_shadow TEXT,
  glow_color TEXT,
  glow_intensity INTEGER DEFAULT 0,
  background_color TEXT,
  border_color TEXT,
  border_width INTEGER DEFAULT 0,
  border_radius INTEGER DEFAULT 4,
  animation TEXT DEFAULT 'none',
  prefix_emoji TEXT,
  suffix_emoji TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.username_styles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view username styles"
ON public.username_styles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert own style"
ON public.username_styles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own style"
ON public.username_styles FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own style"
ON public.username_styles FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_username_styles_updated_at
BEFORE UPDATE ON public.username_styles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();