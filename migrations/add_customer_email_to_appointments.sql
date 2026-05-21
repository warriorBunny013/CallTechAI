-- The appointments table was originally created without a customer_email column.
-- book-appointment inserts customer_email and appointments-list selects it,
-- so both fail silently when the column is missing.
-- Run in Supabase SQL editor.

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_email TEXT;

COMMENT ON COLUMN public.appointments.customer_email IS 'Caller email address for Google Calendar invite';
