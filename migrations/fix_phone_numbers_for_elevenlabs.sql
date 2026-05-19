-- Migration: Fix phone_numbers table for ElevenLabs-only flow
--
-- The original table was built for VAPI and has:
--   1. vapi_phone_number_id — NOT NULL, no longer populated
--   2. vapi_assistant_id    — no longer used (inbound routing is done by webhook)
--
-- This migration makes the VAPI columns nullable so that importing a Twilio
-- number no longer requires a VAPI phone number ID.

-- 1. Make vapi_phone_number_id nullable (no longer required)
ALTER TABLE public.phone_numbers
  ALTER COLUMN vapi_phone_number_id DROP NOT NULL;

-- 2. Drop the UNIQUE constraint that requires vapi_phone_number_id
--    (safe to drop: we can rely on organisation_id + phone_number uniqueness instead)
ALTER TABLE public.phone_numbers
  DROP CONSTRAINT IF EXISTS phone_numbers_user_vapi_unique;

-- 3. Add a new unique constraint on organisation_id + phone_number to prevent duplicates
ALTER TABLE public.phone_numbers
  ADD CONSTRAINT phone_numbers_org_phone_unique
  UNIQUE (organisation_id, phone_number);

-- 4. Add label column if it doesn't exist (used in the import dialog)
ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS label TEXT;
