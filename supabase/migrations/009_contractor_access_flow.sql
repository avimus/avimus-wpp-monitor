-- Allow profiles to exist without a corresponding auth.users entry
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Track whether a profile has Supabase Auth credentials
ALTER TABLE public.profiles ADD COLUMN has_auth boolean NOT NULL DEFAULT false;

-- All profiles created before this migration were created via auth trigger, so they have auth
UPDATE public.profiles SET has_auth = true;

-- Update trigger: when auth user is created, insert or mark profile as having auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, name, role, has_auth)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    'contractor',
    true
  )
  ON CONFLICT (id) DO UPDATE SET has_auth = true;
  RETURN NEW;
END;
$$;
