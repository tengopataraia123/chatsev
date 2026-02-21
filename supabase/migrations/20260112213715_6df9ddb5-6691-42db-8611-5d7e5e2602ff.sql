-- Create verification_requests table first
CREATE TABLE IF NOT EXISTS public.verification_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'canceled')),
    requested_note text,
    admin_note text,
    decided_by uuid,
    decided_at timestamp with time zone,
    attachments jsonb,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);