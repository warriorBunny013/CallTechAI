-- Migration: Remove vapi_tool_ids from organisation_calendar_connections
-- 
-- This column was used to track VAPI tool entity IDs for the old VAPI integration.
-- With ElevenLabs, calendar webhook tools (checkAvailability / bookAppointment) are
-- embedded directly in each ElevenLabs agent at creation time and do not require
-- separate tool entity management.

ALTER TABLE organisation_calendar_connections
  DROP COLUMN IF EXISTS vapi_tool_ids;
