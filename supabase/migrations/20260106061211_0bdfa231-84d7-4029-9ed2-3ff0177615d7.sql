-- Create table for user text styles
CREATE TABLE public.text_styles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
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
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.text_styles ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view all text styles"
  ON public.text_styles
  FOR SELECT
  USING (true);

CREATE POLICY "Users can manage their own text style"
  ON public.text_styles
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);