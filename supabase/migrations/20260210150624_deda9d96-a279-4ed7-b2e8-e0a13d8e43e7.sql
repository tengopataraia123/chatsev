-- Index for reply_to_id FK on new messenger_messages to prevent full table scan on DELETE
CREATE INDEX IF NOT EXISTS idx_messenger_messages_reply_to_id ON public.messenger_messages (reply_to_id);

-- Index for created_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_messenger_messages_created_at ON public.messenger_messages (created_at);