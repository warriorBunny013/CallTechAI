-- ============================================================================
-- Migration: Create working_hours table for assistant working hours
-- ============================================================================
-- 
-- PURPOSE:
-- This table stores working hours configuration for each user's assistant.
-- Users can set specific days and time ranges when their assistant should be active.
--
-- RELATIONSHIP:
-- Clerk User (user_id) → One Working Hours Configuration (1:1)
--
-- USAGE:
-- When working hours are enabled, the assistant will only be active during
-- the specified days and time ranges. Outside these hours, the assistant
-- will be inactive or can provide a custom message.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.working_hours (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id CHARACTER VARYING(255) NOT NULL UNIQUE,  -- Clerk User ID (one config per user)
  is_enabled BOOLEAN DEFAULT false,  -- Whether working hours are enabled
  timezone CHARACTER VARYING(50) DEFAULT 'America/New_York',  -- User's timezone
  monday_enabled BOOLEAN DEFAULT false,
  monday_start_time TIME,
  monday_end_time TIME,
  tuesday_enabled BOOLEAN DEFAULT false,
  tuesday_start_time TIME,
  tuesday_end_time TIME,
  wednesday_enabled BOOLEAN DEFAULT false,
  wednesday_start_time TIME,
  wednesday_end_time TIME,
  thursday_enabled BOOLEAN DEFAULT false,
  thursday_start_time TIME,
  thursday_end_time TIME,
  friday_enabled BOOLEAN DEFAULT false,
  friday_start_time TIME,
  friday_end_time TIME,
  saturday_enabled BOOLEAN DEFAULT false,
  saturday_start_time TIME,
  saturday_end_time TIME,
  sunday_enabled BOOLEAN DEFAULT false,
  sunday_start_time TIME,
  sunday_end_time TIME,
  outside_hours_message TEXT DEFAULT 'Sorry, we are currently closed. Please call back during our business hours.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_working_hours_user_id 
ON public.working_hours USING btree (user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_working_hours_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_working_hours_updated_at 
  BEFORE UPDATE ON public.working_hours 
  FOR EACH ROW 
  EXECUTE FUNCTION update_working_hours_updated_at();

-- Add comments
COMMENT ON TABLE public.working_hours IS 'Stores working hours configuration for user assistants';
COMMENT ON COLUMN public.working_hours.user_id IS 'Clerk User ID - links working hours to user';
COMMENT ON COLUMN public.working_hours.is_enabled IS 'Whether working hours restrictions are active';
COMMENT ON COLUMN public.working_hours.timezone IS 'Timezone for working hours (e.g., America/New_York)';
COMMENT ON COLUMN public.working_hours.outside_hours_message IS 'Message to play when called outside working hours';

