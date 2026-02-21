-- Set REPLICA IDENTITY to FULL for private_messages to fix realtime updates
-- This ensures all column data is available in realtime change events
ALTER TABLE public.private_messages REPLICA IDENTITY FULL;