-- Create app_modules table for managing all application modules
CREATE TABLE public.app_modules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    is_enabled BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    requires_auth BOOLEAN DEFAULT false,
    min_age INTEGER DEFAULT 0,
    allowed_genders TEXT[] DEFAULT ARRAY['male', 'female', 'other']::TEXT[],
    settings JSONB DEFAULT '{}'::JSONB,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_modules ENABLE ROW LEVEL SECURITY;

-- Everyone can read modules
CREATE POLICY "Anyone can read app modules"
ON public.app_modules
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify modules
CREATE POLICY "Admins can manage app modules"
ON public.app_modules
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Create module permissions table for granular control
CREATE TABLE public.app_module_permissions (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    module_id UUID REFERENCES public.app_modules(id) ON DELETE CASCADE NOT NULL,
    permission_type TEXT NOT NULL, -- 'view', 'create', 'edit', 'delete', 'moderate'
    min_role TEXT DEFAULT 'user', -- 'user', 'moderator', 'admin', 'super_admin'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_module_permissions ENABLE ROW LEVEL SECURITY;

-- Everyone can read permissions
CREATE POLICY "Anyone can read module permissions"
ON public.app_module_permissions
FOR SELECT
TO authenticated
USING (true);

-- Only admins can modify permissions
CREATE POLICY "Admins can manage module permissions"
ON public.app_module_permissions
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'super_admin'));

-- Insert default modules
INSERT INTO public.app_modules (name, display_name, description, icon, sort_order, requires_auth) VALUES
('forums', 'ფორუმები', 'დისკუსიები და თემები', 'MessageSquare', 1, false),
('dating', 'გაცნობა', 'გაიცანი ახალი ადამიანები', 'Heart', 2, true),
('photos', 'ფოტოები', 'ფოტოების გალერეა', 'Image', 3, false),
('videos', 'ვიდეოები', 'ვიდეო კონტენტი', 'Video', 4, false),
('stories', 'სთორები', 'დროებითი კონტენტი', 'Clock', 5, true),
('groups', 'ჯგუფები', 'კომუნიტები და ჯგუფები', 'Users', 6, false),
('reels', 'რილსები', 'მოკლე ვიდეოები', 'Film', 7, false),
('live', 'ლაივი', 'პირდაპირი ტრანსლაციები', 'Radio', 8, true),
('messaging', 'შეტყობინებები', 'პირადი მიმოწერა', 'MessageCircle', 9, true),
('group_chat', 'ჯგუფური ჩატი', 'საერთო ჩატი', 'MessagesSquare', 10, true),
('games', 'თამაშები', 'გართობა და თამაშები', 'Gamepad2', 11, true),
('marketplace', 'მარკეტი', 'ყიდვა და გაყიდვა', 'Store', 12, true),
('blogs', 'ბლოგები', 'სტატიები და ბლოგები', 'FileText', 13, false),
('polls', 'გამოკითხვები', 'ხმის მიცემა და გამოკითხვები', 'BarChart3', 14, true),
('betting', 'სპორტი', 'სპორტული ფსონები', 'Trophy', 15, true);

-- Insert default permissions for all modules
INSERT INTO public.app_module_permissions (module_id, permission_type, min_role)
SELECT id, 'view', 'user' FROM public.app_modules;

INSERT INTO public.app_module_permissions (module_id, permission_type, min_role)
SELECT id, 'create', 'user' FROM public.app_modules;

INSERT INTO public.app_module_permissions (module_id, permission_type, min_role)
SELECT id, 'edit', 'user' FROM public.app_modules;

INSERT INTO public.app_module_permissions (module_id, permission_type, min_role)
SELECT id, 'delete', 'user' FROM public.app_modules;

INSERT INTO public.app_module_permissions (module_id, permission_type, min_role)
SELECT id, 'moderate', 'moderator' FROM public.app_modules;

-- Add trigger for updated_at
CREATE TRIGGER update_app_modules_updated_at
    BEFORE UPDATE ON public.app_modules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();