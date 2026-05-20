-- Migration: Add elevenlabs_phone_number_id to phone_numbers table
-- This stores the ElevenLabs phone number ID (e.g. "pn_xxxx") returned when
-- the number is imported via the ElevenLabs ConvAI API, so we can sync
-- agent assignments back to the ElevenLabs dashboard.

ALTER TABLE public.phone_numbers
  ADD COLUMN IF NOT EXISTS elevenlabs_phone_number_id TEXT;

COMMENT ON COLUMN public.phone_numbers.elevenlabs_phone_number_id IS
  'ElevenLabs phone number ID (pn_xxx) — set when number is imported via ElevenLabs API';
