-- ============================================================================
-- Migration: Create phone_numbers table for user phone number management
-- ============================================================================
-- 
-- PURPOSE:
-- This table stores phone numbers that users configure for their VAPI assistants.
-- Each phone number is linked to a Clerk user and can be associated with an assistant.
--
-- RELATIONSHIP:
-- Clerk User (user_id) → Many Phone Numbers (1:many)
-- Phone Number → One Assistant (via assistant_id)
--
-- VAPI INTEGRATION:
-- Phone numbers are created/imported via VAPI API and stored here for reference.
-- When a user configures a phone number with an assistant, inbound calls to that
-- number will use the user's assistant and intents.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.phone_numbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id CHARACTER VARYING(255) NOT NULL,  -- Clerk User ID
  vapi_phone_number_id CHARACTER VARYING(255) NOT NULL,  -- VAPI phone number ID
  phone_number CHARACTER VARYING(20) NOT NULL,  -- E.164 format (e.g., +1234567890)
  country_code CHARACTER VARYING(10),  -- Country code (e.g., US)
  number_type CHARACTER VARYING(20) DEFAULT 'free',  -- 'free' or 'imported'
  assistant_id UUID,  -- Links to assistants table (optional, can be set later)
  vapi_assistant_id CHARACTER VARYING(255),  -- VAPI assistant ID for inbound calls
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one phone number per VAPI ID per user
  CONSTRAINT phone_numbers_user_vapi_unique UNIQUE (user_id, vapi_phone_number_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_id 
ON public.phone_numbers USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_user_created 
ON public.phone_numbers USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_assistant_id 
ON public.phone_numbers USING btree (assistant_id);

CREATE INDEX IF NOT EXISTS idx_phone_numbers_vapi_assistant_id 
ON public.phone_numbers USING btree (vapi_assistant_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_phone_numbers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_phone_numbers_updated_at 
  BEFORE UPDATE ON public.phone_numbers 
  FOR EACH ROW 
  EXECUTE FUNCTION update_phone_numbers_updated_at();

-- Add comment to table
COMMENT ON TABLE public.phone_numbers IS 'Stores phone numbers configured by users for VAPI inbound/outbound calls';
COMMENT ON COLUMN public.phone_numbers.user_id IS 'Clerk User ID - links phone number to user';
COMMENT ON COLUMN public.phone_numbers.vapi_phone_number_id IS 'VAPI phone number ID from VAPI API';
COMMENT ON COLUMN public.phone_numbers.assistant_id IS 'Local assistant ID (from assistants table)';
COMMENT ON COLUMN public.phone_numbers.vapi_assistant_id IS 'VAPI assistant ID for inbound calls';

