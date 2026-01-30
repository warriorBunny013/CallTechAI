-- ============================================================================
-- Migration: Create calls table for storing call data with user ownership
-- ============================================================================
-- 
-- PURPOSE:
-- This table stores call recordings, transcripts, analytics, and metadata.
-- Each call is linked to a user via user_id, which is determined by the
-- caller's phone number (From field), NOT the assistant number (To field).
--
-- CRITICAL OWNERSHIP MODEL:
-- - Call ownership is determined by the caller's clinic phone number (From)
-- - Lookup phone_numbers.phone_number = From to get user_id
-- - Multiple users MAY forward to the SAME assistant number
-- - Data must NEVER mix between users
--
-- RELATIONSHIP:
-- Clerk User (user_id) → Many Calls (1:many)
-- Phone Number (phone_number_id) → Many Calls (1:many)
-- Assistant (assistant_id) → Many Calls (1:many)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id CHARACTER VARYING(255) NOT NULL,  -- Clerk User ID (from caller's phone number)
  phone_number_id UUID,  -- Links to phone_numbers table (caller's clinic number)
  assistant_id UUID,  -- Links to assistants table
  vapi_call_id CHARACTER VARYING(255),  -- VAPI call ID
  caller_phone_number CHARACTER VARYING(20) NOT NULL,  -- From: caller's clinic number
  assistant_phone_number CHARACTER VARYING(20),  -- To: assistant number (may be shared)
  call_status CHARACTER VARYING(50) DEFAULT 'initiated',  -- initiated, completed, failed, etc.
  duration_seconds INTEGER,  -- Call duration in seconds
  recording_url TEXT,  -- URL to call recording
  transcript TEXT,  -- Full call transcript
  summary TEXT,  -- AI-generated summary
  analysis JSONB,  -- Additional analytics data
  metadata JSONB,  -- Additional metadata from VAPI
  started_at TIMESTAMP WITH TIME ZONE,  -- Call start time
  ended_at TIMESTAMP WITH TIME ZONE,  -- Call end time
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for efficient queries
  CONSTRAINT calls_user_id_fk FOREIGN KEY (phone_number_id) 
    REFERENCES public.phone_numbers(id) ON DELETE SET NULL,
  CONSTRAINT calls_assistant_id_fk FOREIGN KEY (assistant_id) 
    REFERENCES public.assistants(id) ON DELETE SET NULL
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_calls_user_id 
ON public.calls USING btree (user_id);

CREATE INDEX IF NOT EXISTS idx_calls_user_created 
ON public.calls USING btree (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_calls_phone_number_id 
ON public.calls USING btree (phone_number_id);

CREATE INDEX IF NOT EXISTS idx_calls_assistant_id 
ON public.calls USING btree (assistant_id);

CREATE INDEX IF NOT EXISTS idx_calls_vapi_call_id 
ON public.calls USING btree (vapi_call_id);

CREATE INDEX IF NOT EXISTS idx_calls_caller_phone_number 
ON public.calls USING btree (caller_phone_number);

CREATE INDEX IF NOT EXISTS idx_calls_status 
ON public.calls USING btree (call_status);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_calls_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_calls_updated_at 
  BEFORE UPDATE ON public.calls 
  FOR EACH ROW 
  EXECUTE FUNCTION update_calls_updated_at();

-- Add comments
COMMENT ON TABLE public.calls IS 'Stores call recordings, transcripts, and analytics with user ownership';
COMMENT ON COLUMN public.calls.user_id IS 'Clerk User ID - determined by caller phone number (From field)';
COMMENT ON COLUMN public.calls.caller_phone_number IS 'Caller clinic phone number (From field) - used to determine ownership';
COMMENT ON COLUMN public.calls.assistant_phone_number IS 'Assistant phone number (To field) - may be shared across users';
COMMENT ON COLUMN public.calls.phone_number_id IS 'Reference to phone_numbers table for the caller clinic number';

