-- This index is critical: without it, every DELETE on private_messages 
-- causes a full table scan to find reply_to_id references (SET NULL FK)
CREATE INDEX IF NOT EXISTS idx_private_messages_reply_to_id ON public.private_messages (reply_to_id);