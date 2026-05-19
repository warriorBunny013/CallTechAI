-- Knowledge base document mappings (ElevenLabs document IDs per org)

CREATE TABLE IF NOT EXISTS public.organisation_knowledge_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organisation_id UUID NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  elevenlabs_document_id TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'text',
  name TEXT NOT NULL,
  source_ref TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_knowledge_org_id
  ON public.organisation_knowledge_documents (organisation_id);

ALTER TABLE public.organisation_knowledge_documents ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'organisation_knowledge_documents'
      AND policyname = 'Service role manages organisation_knowledge_documents'
  ) THEN
    CREATE POLICY "Service role manages organisation_knowledge_documents"
      ON public.organisation_knowledge_documents
      FOR ALL
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Template id on organisation settings
ALTER TABLE public.organisation_settings
  ADD COLUMN IF NOT EXISTS agent_template_id TEXT;

ALTER TABLE public.organisation_settings
  ADD COLUMN IF NOT EXISTS agent_languages JSONB DEFAULT '["en"]'::jsonb;
