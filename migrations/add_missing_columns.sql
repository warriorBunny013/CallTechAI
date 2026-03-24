-- ============================================================================
-- Add missing columns that were referenced but not originally created
-- ============================================================================

-- 1. intents: add updated_at (required by the moddatetime trigger on UPDATE)
ALTER TABLE public.intents
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Back-fill existing rows so the column is not null
UPDATE public.intents SET updated_at = created_at WHERE updated_at IS NULL;

-- 2. appointments: add customer_email (collected during booking but not stored)
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_email TEXT;
