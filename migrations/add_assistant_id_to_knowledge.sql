-- Scope knowledge documents (websites, files) to a specific organisation assistant.

ALTER TABLE public.organisation_knowledge_documents
  ADD COLUMN IF NOT EXISTS organisation_assistant_id UUID
  REFERENCES public.organisation_assistants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_org_knowledge_assistant_id
  ON public.organisation_knowledge_documents (organisation_assistant_id);

-- Backfill: attach existing docs to each org's default assistant
UPDATE public.organisation_knowledge_documents kd
SET organisation_assistant_id = oa.id
FROM public.organisation_assistants oa
WHERE kd.organisation_id = oa.organisation_id
  AND oa.is_default = true
  AND kd.organisation_assistant_id IS NULL
  AND kd.document_type <> 'intent';

-- Orgs without is_default: earliest assistant per org
UPDATE public.organisation_knowledge_documents kd
SET organisation_assistant_id = sub.assistant_id
FROM (
  SELECT DISTINCT ON (organisation_id)
    id AS assistant_id,
    organisation_id
  FROM public.organisation_assistants
  ORDER BY organisation_id, is_default DESC, created_at ASC
) sub
WHERE kd.organisation_id = sub.organisation_id
  AND kd.organisation_assistant_id IS NULL
  AND kd.document_type <> 'intent';
