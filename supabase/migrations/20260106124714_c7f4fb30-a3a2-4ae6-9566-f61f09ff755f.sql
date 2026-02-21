-- Add font_size column to username_styles table
ALTER TABLE public.username_styles 
ADD COLUMN font_size integer DEFAULT 16;

-- Add font_size column to text_styles table
ALTER TABLE public.text_styles 
ADD COLUMN font_size integer DEFAULT 16;