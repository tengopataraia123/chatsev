-- Fix dating_blocks RLS policy to allow users to see blocks where they are either blocker or blocked
DROP POLICY IF EXISTS "Users can view their own blocks" ON dating_blocks;

CREATE POLICY "Users can view blocks involving them"
ON dating_blocks FOR SELECT
USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);