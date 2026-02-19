-- ============================================================================
-- Migration: Add Twilio credentials columns to phone_numbers table
-- ============================================================================
-- Stores Twilio Account SID and Auth Token for imported Twilio numbers.
-- These are used when importing Twilio numbers into Vapi via Vapi API.
-- ============================================================================

-- Add Twilio credential columns (nullable - only set for imported Twilio numbers)
ALTER TABLE public.phone_numbers 
  ADD COLUMN IF NOT EXISTS twilio_account_sid TEXT,
  ADD COLUMN IF NOT EXISTS twilio_auth_token TEXT;

-- Add comment
COMMENT ON COLUMN public.phone_numbers.twilio_account_sid IS 'Twilio Account SID (stored for Twilio-imported numbers, used by Vapi import API)';
COMMENT ON COLUMN public.phone_numbers.twilio_auth_token IS 'Twilio Auth Token (stored securely for Twilio-imported numbers, used by Vapi import API)';

-- Note: In production, consider encrypting these sensitive fields using Supabase Vault or application-level encryption.
