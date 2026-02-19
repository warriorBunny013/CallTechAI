-- ============================================================================
-- Multi-Tenant Schema: Organisations as First-Class Entities
-- ============================================================================
-- Tenant boundary: organisation_id. Users belong to orgs via organisation_members.
-- Phone numbers, intents, calls, etc. belong to organisations.
-- Run after: create_profiles_table, create_phone_numbers_table, create_calls_table,
--           create_rls_policies, add_user_id_to_tables, create_working_hours_table,
--           create_subscriptions_table, and existing intents/assistant_settings.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ORGANISATIONS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organisations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  selected_voice_agent_id TEXT,  -- One of 6 Vapi voice agent template IDs (e.g. professional-english-female)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organisations_name ON public.organisations(name);

COMMENT ON TABLE public.organisations IS 'Tenant root: clinic/business. All data scoped by organisation_id.';

-- ----------------------------------------------------------------------------
-- 2. ORGANISATION MEMBERS (user <-> org with role)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organisation_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner',  -- owner, admin, member
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organisation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_members_org ON public.organisation_members(organisation_id);
CREATE INDEX IF NOT EXISTS idx_organisation_members_user ON public.organisation_members(user_id);

COMMENT ON TABLE public.organisation_members IS 'Users belong to organisations. RLS uses this to allow access by org.';

-- ----------------------------------------------------------------------------
-- 3. ADD organisation_id TO EXISTING TABLES (nullable first for backfill)
-- ----------------------------------------------------------------------------

-- phone_numbers: belong to organisation (clinic number)
ALTER TABLE public.phone_numbers ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_phone_numbers_organisation_id ON public.phone_numbers(organisation_id);

-- intents: org-level business intents
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intents') THEN
    ALTER TABLE public.intents ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_intents_organisation_id ON public.intents(organisation_id);
  END IF;
END $$;

-- assistant_settings: one per organisation (replace user_id 1:1 with org 1:1)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_settings') THEN
    ALTER TABLE public.assistant_settings ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_assistant_settings_organisation_id ON public.assistant_settings(organisation_id);
  END IF;
END $$;

-- working_hours: per organisation
ALTER TABLE public.working_hours ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_working_hours_organisation_id ON public.working_hours(organisation_id);

-- subscriptions: one per organisation (billing)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_subscriptions_organisation_id ON public.subscriptions(organisation_id);
  END IF;
END $$;

-- calls: per organisation
ALTER TABLE public.calls ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_calls_organisation_id ON public.calls(organisation_id);

-- assistants (if exists): per organisation
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistants') THEN
    ALTER TABLE public.assistants ADD COLUMN IF NOT EXISTS organisation_id UUID REFERENCES public.organisations(id) ON DELETE CASCADE;
    CREATE INDEX IF NOT EXISTS idx_assistants_organisation_id ON public.assistants(organisation_id);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. BACKFILL: one organisation per existing user, then set organisation_id
-- ----------------------------------------------------------------------------
-- Run this block once to migrate existing user_id-based data to organisation_id.
-- Uses profiles.organisation_name for org name; creates org and membership.

DO $$
DECLARE
  rec RECORD;
  new_org_id UUID;
BEGIN
  -- Create org + membership for each profile that doesn't have an org yet
  FOR rec IN
    SELECT p.id AS user_id, p.organisation_name
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.organisation_members om WHERE om.user_id = p.id
    )
  LOOP
    INSERT INTO public.organisations (name)
    VALUES (COALESCE(NULLIF(TRIM(rec.organisation_name), ''), 'My Organisation'))
    RETURNING id INTO new_org_id;

    INSERT INTO public.organisation_members (organisation_id, user_id, role)
    VALUES (new_org_id, rec.user_id, 'owner');

    -- Backfill phone_numbers (user_id was owner)
    UPDATE public.phone_numbers SET organisation_id = new_org_id WHERE user_id = rec.user_id::text;

    -- Backfill intents
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'intents') THEN
      UPDATE public.intents SET organisation_id = new_org_id WHERE user_id = rec.user_id::text;
    END IF;

    -- Backfill assistant_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_settings') THEN
      UPDATE public.assistant_settings SET organisation_id = new_org_id WHERE user_id = rec.user_id::text;
    END IF;

    -- Backfill working_hours
    UPDATE public.working_hours SET organisation_id = new_org_id WHERE user_id = rec.user_id::text;

    -- Backfill subscriptions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subscriptions') THEN
      UPDATE public.subscriptions SET organisation_id = new_org_id WHERE user_id = rec.user_id::text;
    END IF;

    -- Backfill calls (ownership was by user_id)
    UPDATE public.calls SET organisation_id = new_org_id WHERE user_id = rec.user_id::text;

    -- Backfill assistants if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistants') THEN
      UPDATE public.assistants SET organisation_id = new_org_id WHERE user_id = rec.user_id::text;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 5. GOOGLE CALENDAR: per-organisation OAuth and appointments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.organisation_calendar_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE UNIQUE,
  access_token TEXT,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  calendar_id TEXT,  -- primary calendar id (e.g. primary)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_calendar_org ON public.organisation_calendar_connections(organisation_id);

CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  calendar_event_id TEXT,  -- Google Calendar event id
  summary TEXT,
  description TEXT,
  start_at TIMESTAMP WITH TIME ZONE NOT NULL,
  end_at TIMESTAMP WITH TIME ZONE NOT NULL,
  customer_phone TEXT,
  customer_name TEXT,
  call_id UUID REFERENCES public.calls(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_appointments_organisation_id ON public.appointments(organisation_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON public.appointments(start_at);

-- ----------------------------------------------------------------------------
-- 6. PHONE NUMBERS: E.164 uniqueness per org (one clinic number per org can be same E.164 in different orgs in theory, but we enforce per-org uniqueness)
-- ----------------------------------------------------------------------------
-- Ensure phone_numbers.phone_number is the CLINIC number (the number customers call = To in Twilio)
COMMENT ON COLUMN public.phone_numbers.phone_number IS 'E.164 clinic number that customers call (Twilio webhook To field).';
