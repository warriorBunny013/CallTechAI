-- ============================================================================
-- Multi-Tenant RLS: Organisation-Scoped Access
-- ============================================================================
-- Users can only access rows where they are a member of the row's organisation.
-- Run after: multi_tenant_organisations_schema.sql (and backfill completed).
-- ============================================================================

-- Helper: user's organisation IDs (used in policies)
CREATE OR REPLACE FUNCTION public.user_organisation_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id FROM public.organisation_members WHERE user_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- ORGANISATIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own organisation" ON public.organisations;
CREATE POLICY "Users can view orgs they belong to"
  ON public.organisations FOR SELECT
  USING (id IN (SELECT public.user_organisation_ids()));

DROP POLICY IF EXISTS "Users can update own organisation" ON public.organisations;
CREATE POLICY "Users can update orgs they belong to"
  ON public.organisations FOR UPDATE
  USING (id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (id IN (SELECT public.user_organisation_ids()));

-- Insert: signup/create-org uses service role; anon cannot insert
CREATE POLICY "Users can insert organisation"
  ON public.organisations FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- ORGANISATION_MEMBERS
-- ----------------------------------------------------------------------------
ALTER TABLE public.organisation_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of their orgs"
  ON public.organisation_members FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can insert members" ON public.organisation_members FOR INSERT
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can update members of their orgs" ON public.organisation_members FOR UPDATE
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can delete members of their orgs" ON public.organisation_members FOR DELETE
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

-- ----------------------------------------------------------------------------
-- PHONE_NUMBERS (organisation_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can insert own phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can update own phone numbers" ON public.phone_numbers;
DROP POLICY IF EXISTS "Users can delete own phone numbers" ON public.phone_numbers;

CREATE POLICY "Users can view org phone numbers"
  ON public.phone_numbers FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can insert org phone numbers"
  ON public.phone_numbers FOR INSERT
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can update org phone numbers"
  ON public.phone_numbers FOR UPDATE
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can delete org phone numbers"
  ON public.phone_numbers FOR DELETE
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

-- ----------------------------------------------------------------------------
-- INTENTS (organisation_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own intents" ON public.intents;
DROP POLICY IF EXISTS "Users can insert own intents" ON public.intents;
DROP POLICY IF EXISTS "Users can update own intents" ON public.intents;
DROP POLICY IF EXISTS "Users can delete own intents" ON public.intents;

CREATE POLICY "Users can view org intents"
  ON public.intents FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can insert org intents"
  ON public.intents FOR INSERT
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can update org intents"
  ON public.intents FOR UPDATE
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can delete org intents"
  ON public.intents FOR DELETE
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

-- ----------------------------------------------------------------------------
-- WORKING_HOURS (organisation_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own working hours" ON public.working_hours;
DROP POLICY IF EXISTS "Users can insert own working hours" ON public.working_hours;
DROP POLICY IF EXISTS "Users can update own working hours" ON public.working_hours;
DROP POLICY IF EXISTS "Users can delete own working hours" ON public.working_hours;

CREATE POLICY "Users can view org working hours"
  ON public.working_hours FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can insert org working hours"
  ON public.working_hours FOR INSERT
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can update org working hours"
  ON public.working_hours FOR UPDATE
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can delete org working hours"
  ON public.working_hours FOR DELETE
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

-- ----------------------------------------------------------------------------
-- CALLS (organisation_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can insert own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can update own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can delete own calls" ON public.calls;

CREATE POLICY "Users can view org calls"
  ON public.calls FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can insert org calls"
  ON public.calls FOR INSERT
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can update org calls"
  ON public.calls FOR UPDATE
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can delete org calls"
  ON public.calls FOR DELETE
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

-- ----------------------------------------------------------------------------
-- SUBSCRIPTIONS (organisation_id)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can delete own subscription" ON public.subscriptions;

CREATE POLICY "Users can view org subscription"
  ON public.subscriptions FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can insert org subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can update org subscription"
  ON public.subscriptions FOR UPDATE
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can delete org subscription"
  ON public.subscriptions FOR DELETE
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

-- ----------------------------------------------------------------------------
-- ASSISTANT_SETTINGS (organisation_id)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistant_settings') THEN
    DROP POLICY IF EXISTS "Users can view own assistant settings" ON public.assistant_settings;
    DROP POLICY IF EXISTS "Users can insert own assistant settings" ON public.assistant_settings;
    DROP POLICY IF EXISTS "Users can update own assistant settings" ON public.assistant_settings;
    DROP POLICY IF EXISTS "Users can delete own assistant settings" ON public.assistant_settings;

    CREATE POLICY "Users can view org assistant settings"
      ON public.assistant_settings FOR SELECT
      USING (organisation_id IN (SELECT public.user_organisation_ids()));

    CREATE POLICY "Users can insert org assistant settings"
      ON public.assistant_settings FOR INSERT
      WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

    CREATE POLICY "Users can update org assistant settings"
      ON public.assistant_settings FOR UPDATE
      USING (organisation_id IN (SELECT public.user_organisation_ids()))
      WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

    CREATE POLICY "Users can delete org assistant settings"
      ON public.assistant_settings FOR DELETE
      USING (organisation_id IN (SELECT public.user_organisation_ids()));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- ASSISTANTS (if exists, organisation_id)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'assistants') THEN
    DROP POLICY IF EXISTS "Users can view own assistants" ON public.assistants;
    DROP POLICY IF EXISTS "Users can insert own assistants" ON public.assistants;
    DROP POLICY IF EXISTS "Users can update own assistants" ON public.assistants;
    DROP POLICY IF EXISTS "Users can delete own assistants" ON public.assistants;

    CREATE POLICY "Users can view org assistants"
      ON public.assistants FOR SELECT
      USING (organisation_id IN (SELECT public.user_organisation_ids()));

    CREATE POLICY "Users can insert org assistants"
      ON public.assistants FOR INSERT
      WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

    CREATE POLICY "Users can update org assistants"
      ON public.assistants FOR UPDATE
      USING (organisation_id IN (SELECT public.user_organisation_ids()))
      WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

    CREATE POLICY "Users can delete org assistants"
      ON public.assistants FOR DELETE
      USING (organisation_id IN (SELECT public.user_organisation_ids()));
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- ORGANISATION_CALENDAR_CONNECTIONS & APPOINTMENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.organisation_calendar_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org calendar connections"
  ON public.organisation_calendar_connections FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can manage org calendar connections"
  ON public.organisation_calendar_connections FOR ALL
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view org appointments"
  ON public.appointments FOR SELECT
  USING (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can insert org appointments"
  ON public.appointments FOR INSERT
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can update org appointments"
  ON public.appointments FOR UPDATE
  USING (organisation_id IN (SELECT public.user_organisation_ids()))
  WITH CHECK (organisation_id IN (SELECT public.user_organisation_ids()));

CREATE POLICY "Users can delete org appointments"
  ON public.appointments FOR DELETE
  USING (organisation_id IN (SELECT public.user_organisation_ids()));
