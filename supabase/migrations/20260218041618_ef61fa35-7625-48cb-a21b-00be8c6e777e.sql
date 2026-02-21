
-- ===== 1. poll_shares ცხრილი =====
CREATE TABLE public.poll_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  caption TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_poll_shares_poll_id ON public.poll_shares(poll_id);
CREATE INDEX idx_poll_shares_user_id ON public.poll_shares(user_id);

-- Unique constraint: one share per user per poll
CREATE UNIQUE INDEX idx_poll_shares_unique ON public.poll_shares(poll_id, user_id);

-- Enable RLS
ALTER TABLE public.poll_shares ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view poll shares"
  ON public.poll_shares FOR SELECT USING (true);

CREATE POLICY "Authenticated users can share polls"
  ON public.poll_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own shares"
  ON public.poll_shares FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own share caption"
  ON public.poll_shares FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ===== 2. Update polls INSERT policy: admin-only =====
DROP POLICY IF EXISTS "Users can create polls" ON public.polls;

CREATE POLICY "Only admins can create polls"
  ON public.polls FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'super_admin'::app_role) 
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

-- ===== 3. Add share_count column to polls =====
ALTER TABLE public.polls ADD COLUMN IF NOT EXISTS share_count INTEGER DEFAULT 0;

-- ===== 4. Function to update share_count =====
CREATE OR REPLACE FUNCTION public.update_poll_share_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE polls SET share_count = share_count + 1 WHERE id = NEW.poll_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE polls SET share_count = GREATEST(share_count - 1, 0) WHERE id = OLD.poll_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trigger_update_poll_share_count
  AFTER INSERT OR DELETE ON public.poll_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_poll_share_count();

-- ===== 5. Enable realtime for poll_shares =====
ALTER PUBLICATION supabase_realtime ADD TABLE public.poll_shares;
