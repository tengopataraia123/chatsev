-- Update handle_new_user function to include city and birthday
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, age, gender, login_email, city, birthday)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'username',
    (new.raw_user_meta_data ->> 'age')::integer,
    new.raw_user_meta_data ->> 'gender',
    LOWER(new.email),
    new.raw_user_meta_data ->> 'city',
    (new.raw_user_meta_data ->> 'birthday')::date
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$;