-- Multiple ElevenLabs assistants per organisation (list + add in dashboard)

CREATE TABLE IF NOT EXISTS public.organisation_assistants (
  id                   UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id      UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  elevenlabs_agent_id  TEXT NOT NULL,
  name                 TEXT NOT NULL,
  voice_id             TEXT,
  template_id          TEXT,
  languages            JSONB NOT NULL DEFAULT '["en"]'::jsonb,
  system_prompt        TEXT,
  first_message        TEXT,
  is_default           BOOLEAN NOT NULL DEFAULT false,
  created_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at           TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (elevenlabs_agent_id)
);

CREATE INDEX IF NOT EXISTS idx_organisation_assistants_org
  ON public.organisation_assistants(organisation_id);

CREATE INDEX IF NOT EXISTS idx_organisation_assistants_org_created
  ON public.organisation_assistants(organisation_id, created_at DESC);

COMMENT ON TABLE public.organisation_assistants IS
  'ElevenLabs conversational agents owned by an organisation (supports multiple per org).';

-- Backfill from existing single-assistant setup
INSERT INTO public.organisation_assistants (
  organisation_id,
  elevenlabs_agent_id,
  name,
  voice_id,
  template_id,
  languages,
  system_prompt,
  first_message,
  is_default
)
SELECT
  o.id,
  o.elevenlabs_agent_id,
  COALESCE(os.agent_name, 'Assistant'),
  COALESCE(os.agent_voice_id, o.selected_voice_agent_id),
  os.agent_template_id,
  COALESCE(os.agent_languages, '["en"]'::jsonb),
  os.agent_system_prompt,
  os.agent_first_message,
  true
FROM public.organisations o
LEFT JOIN public.organisation_settings os ON os.organisation_id = o.id
WHERE o.elevenlabs_agent_id IS NOT NULL
ON CONFLICT (elevenlabs_agent_id) DO NOTHING;

ALTER TABLE public.organisation_assistants ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organisation_assistants'
      AND policyname = 'Service role can manage organisation_assistants'
  ) THEN
    CREATE POLICY "Service role can manage organisation_assistants"
      ON public.organisation_assistants
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
