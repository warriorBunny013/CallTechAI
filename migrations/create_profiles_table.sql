-- Profiles table: B2B signup data + 7-day trial
-- id links to auth.users(id) (Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  organisation_name TEXT NOT NULL,
  trial_ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS: users can read/update own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Service role can insert (signup API uses service key or anon with trigger)
CREATE POLICY "Allow insert for authenticated users"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE INDEX IF NOT EXISTS idx_profiles_trial_ends_at ON public.profiles(trial_ends_at);

COMMENT ON TABLE public.profiles IS 'B2B user profiles: name, phone, org, 7-day trial. id = auth.users.id';
