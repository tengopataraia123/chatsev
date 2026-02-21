-- Fix the reaction_type check constraint to add missing 'middle_finger' type
ALTER TABLE public.message_reactions DROP CONSTRAINT IF EXISTS message_reactions_reaction_type_check;

ALTER TABLE public.message_reactions ADD CONSTRAINT message_reactions_reaction_type_check 
CHECK (reaction_type = ANY (ARRAY['like', 'love', 'kiss', 'haha', 'wow', 'sad', 'angry', 'care', 'middle_finger']));