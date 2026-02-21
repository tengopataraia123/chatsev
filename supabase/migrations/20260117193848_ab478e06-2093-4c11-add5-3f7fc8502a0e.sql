-- Update handle_new_user function to also set login_email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, age, gender, login_email)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    (new.raw_user_meta_data ->> 'age')::integer,
    new.raw_user_meta_data ->> 'gender',
    LOWER(new.email)
  );
  RETURN new;
END;
$$;