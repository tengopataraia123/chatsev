-- Create conversation call settings table
CREATE TABLE public.conversation_call_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  calls_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

-- Enable RLS
ALTER TABLE public.conversation_call_settings ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view call settings in their conversations"
ON public.conversation_call_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM conversations c 
    WHERE c.id = conversation_id 
    AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  )
);

CREATE POLICY "Users can manage their own call settings"
ON public.conversation_call_settings FOR ALL
USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversation_call_settings;