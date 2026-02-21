
-- Create enums for cleanup system
DO $$ BEGIN
  CREATE TYPE public.cleanup_item_type AS ENUM ('cache', 'files', 'db', 'logs');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cleanup_risk_level AS ENUM ('safe', 'medium', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.cleanup_run_status AS ENUM ('idle', 'running', 'paused', 'done', 'error');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Create cleanup_items registry table
CREATE TABLE IF NOT EXISTS public.cleanup_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title_ka TEXT NOT NULL,
  description_ka TEXT,
  type public.cleanup_item_type NOT NULL DEFAULT 'db',
  risk_level public.cleanup_risk_level NOT NULL DEFAULT 'safe',
  enabled BOOLEAN NOT NULL DEFAULT true,
  default_batch_size INTEGER NOT NULL DEFAULT 20,
  default_pause_ms INTEGER NOT NULL DEFAULT 200,
  retention_days INTEGER,
  namespace_prefix TEXT,
  path_pattern TEXT,
  query_template TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create cleanup_runs tracking table
CREATE TABLE IF NOT EXISTS public.cleanup_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cleanup_item_id UUID NOT NULL REFERENCES public.cleanup_items(id) ON DELETE CASCADE,
  status public.cleanup_run_status NOT NULL DEFAULT 'idle',
  checkpoint_json JSONB DEFAULT '{}'::jsonb,
  processed_count INTEGER NOT NULL DEFAULT 0,
  processed_batches INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  retry_after TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cleanup_runs_item_id ON public.cleanup_runs(cleanup_item_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_runs_status ON public.cleanup_runs(status);
CREATE INDEX IF NOT EXISTS idx_cleanup_items_enabled ON public.cleanup_items(enabled);

-- Enable RLS
ALTER TABLE public.cleanup_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cleanup_runs ENABLE ROW LEVEL SECURITY;

-- RLS: Only authenticated users can read (admin check done in edge function)
CREATE POLICY "Authenticated users can read cleanup_items"
  ON public.cleanup_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can read cleanup_runs"
  ON public.cleanup_runs FOR SELECT TO authenticated USING (true);

-- Service role handles inserts/updates/deletes via edge function

-- Updated_at trigger for cleanup_items
CREATE OR REPLACE FUNCTION public.update_cleanup_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cleanup_items_updated_at
  BEFORE UPDATE ON public.cleanup_items
  FOR EACH ROW EXECUTE FUNCTION public.update_cleanup_items_updated_at();

-- Updated_at trigger for cleanup_runs
CREATE OR REPLACE FUNCTION public.update_cleanup_runs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_cleanup_runs_updated_at
  BEFORE UPDATE ON public.cleanup_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_cleanup_runs_updated_at();

-- Seed initial cleanup items (upsert by key)
INSERT INTO public.cleanup_items (key, title_ka, description_ka, type, risk_level, enabled, default_batch_size, default_pause_ms, retention_days)
VALUES
  ('db:private_messages', 'პირადი შეტყობინებები', 'პირადი მესიჯების გასუფთავება ბეჩებით; checkpoint და შეცდომაზე skip + retry.', 'db', 'critical', true, 20, 200, NULL),
  ('db:group_messages', 'ჯგუფური შეტყობინებები', 'ჯგუფური ჩატის/შეტყობინებების გასუფთავება ბეჩებით, checkpoint-ით და retry-ით.', 'db', 'critical', true, 20, 200, NULL),
  ('db:unread_receipts', 'წაკითხვის ჩანაწერები', 'წაკითხვის ტრეკინგის/receipt ჩანაწერების cleanup (ძველი/ობოლი).', 'db', 'medium', true, 50, 150, 30),
  ('db:profile_views', 'პროფილის ნახვები', 'პროფილის ნახვების ლოგების retention cleanup.', 'db', 'safe', true, 200, 100, 30),
  ('db:notifications', 'შეტყობინებები', 'Bell/Notifications ისტორიის გასუფთავება retention-ით.', 'db', 'safe', true, 200, 100, 90)
ON CONFLICT (key) DO NOTHING;

-- Enable realtime for cleanup_runs so UI updates live
ALTER PUBLICATION supabase_realtime ADD TABLE public.cleanup_runs;
