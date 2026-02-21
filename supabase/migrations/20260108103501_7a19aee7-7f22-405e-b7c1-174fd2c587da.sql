-- Drop the duplicate trigger that creates registration pending approval (using CASCADE to handle dependencies)
DROP TRIGGER IF EXISTS on_new_profile_create_approval ON public.profiles;
DROP TRIGGER IF EXISTS on_profile_create_pending_approval ON public.profiles;
DROP FUNCTION IF EXISTS public.create_registration_pending_approval() CASCADE;