-- Create user_activities table to track all user activities for the feed
CREATE TABLE public.user_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  activity_type TEXT NOT NULL, -- 'profile_photo', 'cover_photo', 'status_update', 'bio_update', etc.
  description TEXT, -- Optional description of the activity
  image_url TEXT, -- For photo-related activities
  metadata JSONB DEFAULT '{}', -- Extra data like old/new values
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_activities ENABLE ROW LEVEL SECURITY;

-- Everyone can view activities
CREATE POLICY "Activities are viewable by everyone" 
ON public.user_activities 
FOR SELECT 
USING (true);

-- Users can create their own activities
CREATE POLICY "Users can create own activities" 
ON public.user_activities 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own activities  
CREATE POLICY "Users can delete own activities"
ON public.user_activities 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_activities_created_at ON public.user_activities(created_at DESC);
CREATE INDEX idx_user_activities_user_id ON public.user_activities(user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activities;

-- Create function to auto-create activity when profile photo changes
CREATE OR REPLACE FUNCTION public.create_profile_photo_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if avatar_url changed and is not null
  IF (OLD.avatar_url IS DISTINCT FROM NEW.avatar_url) AND NEW.avatar_url IS NOT NULL THEN
    INSERT INTO public.user_activities (user_id, activity_type, description, image_url, metadata)
    VALUES (
      NEW.user_id, 
      'profile_photo', 
      'შეცვალა პროფილის ფოტო',
      NEW.avatar_url,
      jsonb_build_object('old_avatar', OLD.avatar_url, 'new_avatar', NEW.avatar_url)
    );
  END IF;
  
  -- Check if cover_url changed and is not null
  IF (OLD.cover_url IS DISTINCT FROM NEW.cover_url) AND NEW.cover_url IS NOT NULL THEN
    INSERT INTO public.user_activities (user_id, activity_type, description, image_url, metadata)
    VALUES (
      NEW.user_id, 
      'cover_photo', 
      'შეცვალა გარეკანის ფოტო',
      NEW.cover_url,
      jsonb_build_object('old_cover', OLD.cover_url, 'new_cover', NEW.cover_url)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for profile updates
CREATE TRIGGER on_profile_photo_change
AFTER UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.create_profile_photo_activity();