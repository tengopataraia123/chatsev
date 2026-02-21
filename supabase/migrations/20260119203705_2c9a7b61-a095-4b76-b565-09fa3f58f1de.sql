-- Create table for username history
CREATE TABLE public.username_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    old_username TEXT NOT NULL,
    new_username TEXT NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.username_history ENABLE ROW LEVEL SECURITY;

-- Only super admins can view username history
CREATE POLICY "Super admins can view username history"
ON public.username_history
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create table for device account tracking
CREATE TABLE public.device_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_fingerprint TEXT NOT NULL,
    user_id UUID NOT NULL,
    username TEXT,
    first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    user_agent TEXT,
    UNIQUE(device_fingerprint, user_id)
);

-- Enable RLS
ALTER TABLE public.device_accounts ENABLE ROW LEVEL SECURITY;

-- Only super admins can view device accounts
CREATE POLICY "Super admins can view device accounts"
ON public.device_accounts
FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

-- Allow authenticated users to insert/update their own device tracking
CREATE POLICY "Users can track their own device"
ON public.device_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tracking"
ON public.device_accounts
FOR UPDATE
USING (auth.uid() = user_id);

-- Create function to track username changes
CREATE OR REPLACE FUNCTION public.track_username_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only track if username actually changed and old username exists
    IF OLD.username IS NOT NULL AND NEW.username IS NOT NULL AND OLD.username <> NEW.username THEN
        INSERT INTO public.username_history (user_id, old_username, new_username)
        VALUES (NEW.user_id, OLD.username, NEW.username);
    END IF;
    RETURN NEW;
END;
$$;

-- Create trigger for username changes on profiles table
CREATE TRIGGER on_username_change
    AFTER UPDATE OF username ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.track_username_change();

-- Create indexes for better performance
CREATE INDEX idx_username_history_user_id ON public.username_history(user_id);
CREATE INDEX idx_device_accounts_user_id ON public.device_accounts(user_id);
CREATE INDEX idx_device_accounts_fingerprint ON public.device_accounts(device_fingerprint);