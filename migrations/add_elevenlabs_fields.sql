-- ============================================================================
-- Migration: Add ElevenLabs fields (Vapi → ElevenLabs migration)
-- ============================================================================
--
-- Run this after deploying the ElevenLabs integration to update the schema.
-- All Vapi-specific columns are kept for backward compatibility but new
-- ElevenLabs columns are added for the new integration.
--
-- KEY CHANGES:
--   phone_numbers:  add elevenlabs_agent_id  (per-number agent override)
--   organisations:  add elevenlabs_agent_id  (org-level default agent)
--   calls:          add elevenlabs_conversation_id (replaces vapi_call_id usage)
-- ============================================================================

-- 1. Add elevenlabs_agent_id to phone_numbers (per-number agent ID override)
ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT;

COMMENT ON COLUMN public.phone_numbers.elevenlabs_agent_id IS
  'ElevenLabs Conversational AI agent ID for calls on this number. Overrides org default.';

-- 2. Add elevenlabs_agent_id to organisations (org-level default)
ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS elevenlabs_agent_id TEXT;

COMMENT ON COLUMN public.organisations.elevenlabs_agent_id IS
  'Default ElevenLabs Conversational AI agent ID for this organisation.';

-- 3. Add elevenlabs_conversation_id to calls (ElevenLabs conversation tracking)
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS elevenlabs_conversation_id TEXT;

CREATE INDEX IF NOT EXISTS idx_calls_elevenlabs_conversation_id
  ON public.calls USING btree (elevenlabs_conversation_id);

COMMENT ON COLUMN public.calls.elevenlabs_conversation_id IS
  'ElevenLabs conversation ID (equivalent to vapi_call_id in the old integration).';

-- 4. Rename vapi_call_id index note (no rename needed – column kept for history)
COMMENT ON COLUMN public.calls.vapi_call_id IS
  'Legacy: VAPI call ID (no longer populated after ElevenLabs migration). Kept for historical data.';
