-- Drop the old unique constraint that prevents multiple reactions per user
ALTER TABLE public.message_reactions 
DROP CONSTRAINT IF EXISTS message_reactions_user_id_message_type_message_id_key;

-- Add new unique constraint that allows multiple reactions but prevents duplicate reaction types per user per message
ALTER TABLE public.message_reactions 
ADD CONSTRAINT message_reactions_user_message_reaction_unique 
UNIQUE (user_id, message_id, message_type, reaction_type);

-- Drop old reaction type check constraint
ALTER TABLE public.message_reactions 
DROP CONSTRAINT IF EXISTS message_reactions_reaction_type_check;

-- Add updated reaction type check with all reactions including 'kiss'
ALTER TABLE public.message_reactions 
ADD CONSTRAINT message_reactions_reaction_type_check 
CHECK (reaction_type = ANY (ARRAY['like', 'love', 'kiss', 'haha', 'wow', 'sad', 'angry', 'care']));

-- Also add 'post' to message_type check since it's used in the code
ALTER TABLE public.message_reactions 
DROP CONSTRAINT IF EXISTS message_reactions_message_type_check;

ALTER TABLE public.message_reactions 
ADD CONSTRAINT message_reactions_message_type_check 
CHECK (message_type = ANY (ARRAY['group_chat', 'private', 'comment', 'reply', 'post']));