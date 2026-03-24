-- appointments.call_id was UUID FK → public.calls(id), but the app stores VAPI's
-- call id string (same id as end-of-call-report). That FK fails when no matching
-- row exists in calls — inserts were silently failing and Telegram/bookings broke.
--
-- Run in Supabase SQL editor (or your migration runner).

ALTER TABLE public.appointments DROP CONSTRAINT IF EXISTS appointments_call_id_fkey;

ALTER TABLE public.appointments
  ALTER COLUMN call_id TYPE TEXT USING call_id::text;

COMMENT ON COLUMN public.appointments.call_id IS 'VAPI call id (string) for this booking; matches end-of-call-report call.id';

CREATE INDEX IF NOT EXISTS idx_appointments_call_id ON public.appointments (call_id) WHERE call_id IS NOT NULL;
