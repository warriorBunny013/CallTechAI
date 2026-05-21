-- Add availability_settings column to organisation_calendar_connections.
-- Stores working days/hours/slot config set by the business owner in the Bookings page.
-- Required for the AI assistant to know when appointments can be offered to callers.

ALTER TABLE public.organisation_calendar_connections
  ADD COLUMN IF NOT EXISTS availability_settings JSONB DEFAULT '{}';

COMMENT ON COLUMN public.organisation_calendar_connections.availability_settings IS
  'JSON: { days: string[], startHour: number, endHour: number, appointmentDuration: number, bufferTime: number }';
