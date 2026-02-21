-- Add admin DELETE policies for emigrants_room_messages
CREATE POLICY "Admins can delete emigrants room messages"
ON public.emigrants_room_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can delete emigrants room messages"
ON public.emigrants_room_messages FOR DELETE
USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Super admins can delete emigrants room messages"
ON public.emigrants_room_messages FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add admin UPDATE policies for emigrants_room_messages
CREATE POLICY "Admins can update emigrants room messages"
ON public.emigrants_room_messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can update emigrants room messages"
ON public.emigrants_room_messages FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Add admin DELETE policies for night_room_messages
CREATE POLICY "Admins can delete night room messages"
ON public.night_room_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can delete night room messages"
ON public.night_room_messages FOR DELETE
USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Super admins can delete night room messages"
ON public.night_room_messages FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add admin UPDATE policies for night_room_messages
CREATE POLICY "Admins can update night room messages"
ON public.night_room_messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can update night room messages"
ON public.night_room_messages FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));

-- Add admin DELETE policies for dj_room_messages
CREATE POLICY "Admins can delete dj room messages"
ON public.dj_room_messages FOR DELETE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Moderators can delete dj room messages"
ON public.dj_room_messages FOR DELETE
USING (has_role(auth.uid(), 'moderator'));

CREATE POLICY "Super admins can delete dj room messages"
ON public.dj_room_messages FOR DELETE
USING (has_role(auth.uid(), 'super_admin'));

-- Add admin UPDATE policies for dj_room_messages
CREATE POLICY "Admins can update dj room messages"
ON public.dj_room_messages FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Super admins can update dj room messages"
ON public.dj_room_messages FOR UPDATE
USING (has_role(auth.uid(), 'super_admin'))
WITH CHECK (has_role(auth.uid(), 'super_admin'));