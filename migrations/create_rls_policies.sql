-- ============================================================================
-- Migration: Create Row Level Security (RLS) Policies for Multi-Tenant Isolation
-- ============================================================================
-- 
-- PURPOSE:
-- Enable RLS on all user-specific tables to ensure data isolation.
-- Users can ONLY access rows where user_id matches their Clerk user ID.
-- 
-- CRITICAL SECURITY:
-- - All policies use auth.uid() to get the current user's Clerk ID
-- - Users cannot access other users' data
-- - All queries automatically filter by user_id
-- 
-- TABLES PROTECTED:
-- - assistants
-- - phone_numbers
-- - assistant_tests
-- - intents
-- - subscriptions
-- - working_hours
-- - calls
-- ============================================================================

-- ============================================================================
-- 1. ASSISTANTS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE public.assistants ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own assistants
CREATE POLICY "Users can view own assistants"
ON public.assistants
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can only INSERT their own assistants
CREATE POLICY "Users can insert own assistants"
ON public.assistants
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only UPDATE their own assistants
CREATE POLICY "Users can update own assistants"
ON public.assistants
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only DELETE their own assistants
CREATE POLICY "Users can delete own assistants"
ON public.assistants
FOR DELETE
USING (user_id = auth.uid()::text);

-- ============================================================================
-- 2. PHONE_NUMBERS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE public.phone_numbers ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own phone numbers
CREATE POLICY "Users can view own phone numbers"
ON public.phone_numbers
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can only INSERT their own phone numbers
CREATE POLICY "Users can insert own phone numbers"
ON public.phone_numbers
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only UPDATE their own phone numbers
CREATE POLICY "Users can update own phone numbers"
ON public.phone_numbers
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only DELETE their own phone numbers
CREATE POLICY "Users can delete own phone numbers"
ON public.phone_numbers
FOR DELETE
USING (user_id = auth.uid()::text);

-- ============================================================================
-- 3. ASSISTANT_TESTS TABLE
-- ============================================================================

-- Enable RLS (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'assistant_tests'
  ) THEN
    ALTER TABLE public.assistant_tests ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can only SELECT their own tests
    DROP POLICY IF EXISTS "Users can view own assistant tests" ON public.assistant_tests;
    CREATE POLICY "Users can view own assistant tests"
    ON public.assistant_tests
    FOR SELECT
    USING (user_id = auth.uid()::text);

    -- Policy: Users can only INSERT their own tests
    DROP POLICY IF EXISTS "Users can insert own assistant tests" ON public.assistant_tests;
    CREATE POLICY "Users can insert own assistant tests"
    ON public.assistant_tests
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

    -- Policy: Users can only UPDATE their own tests
    DROP POLICY IF EXISTS "Users can update own assistant tests" ON public.assistant_tests;
    CREATE POLICY "Users can update own assistant tests"
    ON public.assistant_tests
    FOR UPDATE
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

    -- Policy: Users can only DELETE their own tests
    DROP POLICY IF EXISTS "Users can delete own assistant tests" ON public.assistant_tests;
    CREATE POLICY "Users can delete own assistant tests"
    ON public.assistant_tests
    FOR DELETE
    USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- ============================================================================
-- 4. INTENTS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE public.intents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own intents
DROP POLICY IF EXISTS "Users can view own intents" ON public.intents;
CREATE POLICY "Users can view own intents"
ON public.intents
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can only INSERT their own intents
DROP POLICY IF EXISTS "Users can insert own intents" ON public.intents;
CREATE POLICY "Users can insert own intents"
ON public.intents
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only UPDATE their own intents
DROP POLICY IF EXISTS "Users can update own intents" ON public.intents;
CREATE POLICY "Users can update own intents"
ON public.intents
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only DELETE their own intents
DROP POLICY IF EXISTS "Users can delete own intents" ON public.intents;
CREATE POLICY "Users can delete own intents"
ON public.intents
FOR DELETE
USING (user_id = auth.uid()::text);

-- ============================================================================
-- 5. SUBSCRIPTIONS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own subscription
DROP POLICY IF EXISTS "Users can view own subscription" ON public.subscriptions;
CREATE POLICY "Users can view own subscription"
ON public.subscriptions
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can only INSERT their own subscription
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert own subscription"
ON public.subscriptions
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only UPDATE their own subscription
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
ON public.subscriptions
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only DELETE their own subscription
DROP POLICY IF EXISTS "Users can delete own subscription" ON public.subscriptions;
CREATE POLICY "Users can delete own subscription"
ON public.subscriptions
FOR DELETE
USING (user_id = auth.uid()::text);

-- ============================================================================
-- 6. WORKING_HOURS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE public.working_hours ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own working hours
DROP POLICY IF EXISTS "Users can view own working hours" ON public.working_hours;
CREATE POLICY "Users can view own working hours"
ON public.working_hours
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can only INSERT their own working hours
DROP POLICY IF EXISTS "Users can insert own working hours" ON public.working_hours;
CREATE POLICY "Users can insert own working hours"
ON public.working_hours
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only UPDATE their own working hours
DROP POLICY IF EXISTS "Users can update own working hours" ON public.working_hours;
CREATE POLICY "Users can update own working hours"
ON public.working_hours
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only DELETE their own working hours
DROP POLICY IF EXISTS "Users can delete own working hours" ON public.working_hours;
CREATE POLICY "Users can delete own working hours"
ON public.working_hours
FOR DELETE
USING (user_id = auth.uid()::text);

-- ============================================================================
-- 7. CALLS TABLE
-- ============================================================================

-- Enable RLS
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only SELECT their own calls
-- CRITICAL: This ensures users only see calls from their clinic phone numbers
DROP POLICY IF EXISTS "Users can view own calls" ON public.calls;
CREATE POLICY "Users can view own calls"
ON public.calls
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can only INSERT their own calls
-- Note: This is mainly for webhook handlers, but still enforces ownership
DROP POLICY IF EXISTS "Users can insert own calls" ON public.calls;
CREATE POLICY "Users can insert own calls"
ON public.calls
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only UPDATE their own calls
DROP POLICY IF EXISTS "Users can update own calls" ON public.calls;
CREATE POLICY "Users can update own calls"
ON public.calls
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can only DELETE their own calls
DROP POLICY IF EXISTS "Users can delete own calls" ON public.calls;
CREATE POLICY "Users can delete own calls"
ON public.calls
FOR DELETE
USING (user_id = auth.uid()::text);

-- ============================================================================
-- 8. ASSISTANT_SETTINGS TABLE
-- ============================================================================

-- Enable RLS (only if table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'assistant_settings'
  ) THEN
    ALTER TABLE public.assistant_settings ENABLE ROW LEVEL SECURITY;

    -- Policy: Users can only SELECT their own settings
    DROP POLICY IF EXISTS "Users can view own assistant settings" ON public.assistant_settings;
    CREATE POLICY "Users can view own assistant settings"
    ON public.assistant_settings
    FOR SELECT
    USING (user_id = auth.uid()::text);

    -- Policy: Users can only INSERT their own settings
    DROP POLICY IF EXISTS "Users can insert own assistant settings" ON public.assistant_settings;
    CREATE POLICY "Users can insert own assistant settings"
    ON public.assistant_settings
    FOR INSERT
    WITH CHECK (user_id = auth.uid()::text);

    -- Policy: Users can only UPDATE their own settings
    DROP POLICY IF EXISTS "Users can update own assistant settings" ON public.assistant_settings;
    CREATE POLICY "Users can update own assistant settings"
    ON public.assistant_settings
    FOR UPDATE
    USING (user_id = auth.uid()::text)
    WITH CHECK (user_id = auth.uid()::text);

    -- Policy: Users can only DELETE their own settings
    DROP POLICY IF EXISTS "Users can delete own assistant settings" ON public.assistant_settings;
    CREATE POLICY "Users can delete own assistant settings"
    ON public.assistant_settings
    FOR DELETE
    USING (user_id = auth.uid()::text);
  END IF;
END $$;

-- ============================================================================
-- NOTES ON RLS AND CLERK INTEGRATION
-- ============================================================================
-- 
-- IMPORTANT: Supabase RLS uses auth.uid() which expects a UUID.
-- However, Clerk uses string user IDs (e.g., "user_2abc123xyz").
-- 
-- To make RLS work with Clerk:
-- 1. Use service role key for server-side operations (bypasses RLS)
-- 2. OR create a custom auth function that maps Clerk user_id to Supabase auth.uid()
-- 3. OR rely on application-level filtering (current approach)
-- 
-- CURRENT APPROACH:
-- - Application-level filtering: All API routes filter by user_id from Clerk
-- - RLS policies: Additional security layer (may need custom auth setup)
-- - Best practice: Use both application-level AND RLS for defense in depth
-- 
-- For now, RLS policies are created but may need custom auth setup to work fully.
-- Application-level filtering in API routes is the primary security mechanism.
-- ============================================================================

