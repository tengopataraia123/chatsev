-- Add pinning support to group chat messages
ALTER TABLE public.group_chat_messages
ADD COLUMN is_pinned boolean NOT NULL DEFAULT false,
ADD COLUMN pinned_by uuid REFERENCES auth.users(id) DEFAULT NULL,
ADD COLUMN pinned_at timestamptz DEFAULT NULL;

-- Add anonymous mode support
ALTER TABLE public.group_chat_messages
ADD COLUMN is_anonymous boolean NOT NULL DEFAULT false;

-- Index for pinned messages lookup
CREATE INDEX idx_group_chat_messages_pinned ON public.group_chat_messages (is_pinned) WHERE is_pinned = true;

-- Index for leaderboard queries (weekly message count)
CREATE INDEX idx_group_chat_messages_user_created ON public.group_chat_messages (user_id, created_at DESC);