-- Migration: add_organisation_settings
-- Adds organisation_settings table for storing ElevenLabs agent configuration
-- per organisation (name, voice, language, custom system prompt, first message).

-- 1. Create organisation_settings table
CREATE TABLE IF NOT EXISTS public.organisation_settings (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  agent_name           TEXT,
  agent_voice_id       TEXT,
  agent_language       TEXT DEFAULT 'en',
  agent_system_prompt  TEXT,
  agent_first_message  TEXT,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (organisation_id)
);

COMMENT ON TABLE public.organisation_settings IS
  'Per-organisation ElevenLabs agent settings (voice, language, custom prompts).';

-- 2. Ensure elevenlabs_agent_id columns exist on organisations and phone_numbers
-- (added by migrations/add_elevenlabs_fields.sql — kept here as IF NOT EXISTS for safety)
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT;

ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT;

-- 3. Add Twilio credential columns to phone_numbers if not present
ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT;

ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT;

ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS label TEXT;

-- 4. Add ended_at column to calls if not present (populated by ElevenLabs post-call webhook)
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMP WITH TIME ZONE;

-- 5. Enable RLS on organisation_settings
ALTER TABLE public.organisation_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organisation_settings'
      AND policyname = 'Service role can manage organisation_settings'
  ) THEN
    CREATE POLICY "Service role can manage organisation_settings"
      ON public.organisation_settings
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
