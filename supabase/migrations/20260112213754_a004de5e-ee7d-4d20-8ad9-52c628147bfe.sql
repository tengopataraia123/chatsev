-- Add verified fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verified_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS verified_by uuid,
ADD COLUMN IF NOT EXISTS verified_note text;

-- Enable RLS on verification_requests
ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "Users can view own verification requests"
ON public.verification_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own requests
CREATE POLICY "Users can create verification requests"
ON public.verification_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can cancel their own pending requests
CREATE POLICY "Users can cancel own pending requests"
ON public.verification_requests
FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending')
WITH CHECK (status = 'canceled');

-- Super admins can view all requests
CREATE POLICY "Super admins can view all verification requests"
ON public.verification_requests
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- Super admins can update all requests
CREATE POLICY "Super admins can update verification requests"
ON public.verification_requests
FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'super_admin'
    )
);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_verification_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_verification_requests_updated_at ON public.verification_requests;
CREATE TRIGGER update_verification_requests_updated_at
    BEFORE UPDATE ON public.verification_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_verification_requests_updated_at();

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_verification_requests_user_id ON public.verification_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_requests_status ON public.verification_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_is_verified ON public.profiles(is_verified) WHERE is_verified = true;