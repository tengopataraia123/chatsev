-- Drop the existing UPDATE policy
DROP POLICY IF EXISTS "Users can update own relationship requests" ON relationship_requests;

-- Create a new UPDATE policy with proper WITH CHECK clause
CREATE POLICY "Users can update own relationship requests" ON relationship_requests
  FOR UPDATE USING (
    -- Sender can update their own pending requests (to cancel)
    (auth.uid() = sender_id AND status = 'pending')
    OR 
    -- Receiver can update pending requests they received (to accept/reject)
    (auth.uid() = receiver_id AND status = 'pending')
  )
  WITH CHECK (
    -- Sender can only set status to 'cancelled'
    (auth.uid() = sender_id AND status = 'cancelled')
    OR
    -- Receiver can set status to 'accepted' or 'rejected'
    (auth.uid() = receiver_id AND status IN ('accepted', 'rejected'))
  );