-- Allow authenticated users to insert tracks (for requesting songs)
CREATE POLICY "Authenticated users can insert tracks" 
ON public.dj_room_tracks 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = created_by AND auth.uid() = requested_by_user_id);

-- Allow authenticated users to insert into queue (for their own requests)
CREATE POLICY "Authenticated users can add to queue" 
ON public.dj_room_queue 
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = added_by);