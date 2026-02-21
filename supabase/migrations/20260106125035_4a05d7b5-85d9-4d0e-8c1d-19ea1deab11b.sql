-- Add font_family column to username_styles table
ALTER TABLE public.username_styles 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'default';

-- Add font_family column to text_styles table
ALTER TABLE public.text_styles 
ADD COLUMN IF NOT EXISTS font_family text DEFAULT 'default';