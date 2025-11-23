-- ============================================================================
-- Migration: Add user_id to all tables for multi-user support
-- ============================================================================
-- 
-- PURPOSE:
-- This migration connects Clerk authentication users to Supabase data tables.
-- Each Clerk user gets a unique user_id (e.g., "user_2abc123xyz") which is
-- stored in every table to ensure data isolation.
--
-- HOW IT WORKS:
-- 1. User authenticates via Clerk → Gets Clerk User ID
-- 2. All API routes get userId from Clerk's auth() function
-- 3. All Supabase queries filter by user_id: .eq('user_id', userId)
-- 4. Each user only sees their own data
--
-- RELATIONSHIP:
-- Clerk User (external) ←→ user_id (VARCHAR) ←→ Supabase Tables
-- 
-- NOTE: We cannot create actual foreign keys to Clerk (external service),
--       but user_id acts as a logical foreign key linking all user data.
-- ============================================================================

-- ============================================
-- 1. Update INTENTS table
-- ============================================
-- Only proceed if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'intents'
  ) THEN
    -- Add user_id column to intents
    -- This links each intent to a Clerk user (e.g., "user_2abc123xyz")
    -- Relationship: One Clerk User → Many Intents (1:many)
    ALTER TABLE public.intents 
    ADD COLUMN IF NOT EXISTS user_id CHARACTER VARYING(255) NOT NULL DEFAULT '';

    -- Create index for user_id lookups
    CREATE INDEX IF NOT EXISTS idx_intents_user_id 
    ON public.intents USING btree (user_id);

    -- Create composite index for user_id and created_at for efficient queries
    CREATE INDEX IF NOT EXISTS idx_intents_user_created 
    ON public.intents USING btree (user_id, created_at DESC);
  END IF;
END $$;

-- ============================================
-- 2. Update ASSISTANT_SETTINGS table
-- ============================================
-- Create the table if it doesn't exist (with new schema)
-- user_id is the PRIMARY KEY: One settings record per Clerk user (1:1 relationship)
-- This links assistant settings directly to Clerk User ID
CREATE TABLE IF NOT EXISTS public.assistant_settings (
  user_id CHARACTER VARYING(255) NOT NULL PRIMARY KEY,  -- Clerk User ID (e.g., "user_2abc123xyz")
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- If table already exists with old schema (has id column), migrate it
DO $$
BEGIN
  -- Check if old id column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'assistant_settings' 
    AND column_name = 'id'
  ) THEN
    -- Drop the existing primary key constraint if it exists
    ALTER TABLE public.assistant_settings 
    DROP CONSTRAINT IF EXISTS assistant_settings_pkey;
    
    -- Add user_id column if it doesn't exist (nullable first)
    ALTER TABLE public.assistant_settings 
    ADD COLUMN IF NOT EXISTS user_id CHARACTER VARYING(255);
    
    -- Since assistant_settings should be per-user and we can't assign old global data to users,
    -- we'll delete all old records. Users will get default settings when they first access the feature.
    DELETE FROM public.assistant_settings;
    
    -- Drop the old id column
    ALTER TABLE public.assistant_settings 
    DROP COLUMN IF EXISTS id;
    
    -- Now make user_id NOT NULL (since we deleted all old data)
    ALTER TABLE public.assistant_settings 
    ALTER COLUMN user_id SET NOT NULL;
    
    -- Create new primary key with user_id (one setting per user)
    ALTER TABLE public.assistant_settings 
    ADD CONSTRAINT assistant_settings_pkey PRIMARY KEY (user_id);
  ELSE
    -- Table exists but doesn't have id column, ensure user_id exists and is set up correctly
    ALTER TABLE public.assistant_settings 
    ADD COLUMN IF NOT EXISTS user_id CHARACTER VARYING(255);
    
    -- Make sure user_id is NOT NULL (delete any rows without user_id first)
    DELETE FROM public.assistant_settings WHERE user_id IS NULL;
    ALTER TABLE public.assistant_settings 
    ALTER COLUMN user_id SET NOT NULL;
    
    -- Ensure primary key is set correctly
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.table_constraints 
      WHERE constraint_name = 'assistant_settings_pkey'
    ) THEN
      ALTER TABLE public.assistant_settings 
      ADD CONSTRAINT assistant_settings_pkey PRIMARY KEY (user_id);
    END IF;
  END IF;
END $$;

-- Create index for user_id (though it's already the primary key, this is redundant but safe)
CREATE INDEX IF NOT EXISTS idx_assistant_settings_user_id 
ON public.assistant_settings USING btree (user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_assistant_settings_updated_at ON public.assistant_settings;
CREATE TRIGGER update_assistant_settings_updated_at 
  BEFORE UPDATE ON public.assistant_settings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Update ASSISTANTS table (if keeping it)
-- ============================================
-- Only proceed if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'assistants'
  ) THEN
    -- Add user_id column to assistants
    -- This links each assistant to a Clerk user
    -- Relationship: One Clerk User → Many Assistants (1:many)
    ALTER TABLE public.assistants 
    ADD COLUMN IF NOT EXISTS user_id CHARACTER VARYING(255) NOT NULL DEFAULT '';

    -- Create index for user_id lookups
    CREATE INDEX IF NOT EXISTS idx_assistants_user_id 
    ON public.assistants USING btree (user_id);

    -- Create composite index for user_id and created_at
    CREATE INDEX IF NOT EXISTS idx_assistants_user_created 
    ON public.assistants USING btree (user_id, created_at DESC);

    -- Update unique constraint on vapi_assistant_id to be per-user
    -- First drop the existing unique constraint if it exists
    ALTER TABLE public.assistants 
    DROP CONSTRAINT IF EXISTS assistants_vapi_assistant_id_key;

    -- Drop the new constraint if it already exists
    ALTER TABLE public.assistants 
    DROP CONSTRAINT IF EXISTS assistants_user_vapi_unique;

    -- Add composite unique constraint (user_id, vapi_assistant_id)
    ALTER TABLE public.assistants 
    ADD CONSTRAINT assistants_user_vapi_unique UNIQUE (user_id, vapi_assistant_id);
  END IF;
END $$;

-- ============================================
-- 4. Update ASSISTANT_TESTS table (if keeping it)
-- ============================================
-- Only proceed if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'assistant_tests'
  ) THEN
    -- Add user_id column to assistant_tests
    -- This links each test to a Clerk user
    -- Relationship: One Clerk User → Many Tests (1:many)
    ALTER TABLE public.assistant_tests 
    ADD COLUMN IF NOT EXISTS user_id CHARACTER VARYING(255) NOT NULL DEFAULT '';

    -- Create index for user_id lookups
    CREATE INDEX IF NOT EXISTS idx_assistant_tests_user_id 
    ON public.assistant_tests USING btree (user_id);

    -- Create composite index for user_id and created_at
    CREATE INDEX IF NOT EXISTS idx_assistant_tests_user_created 
    ON public.assistant_tests USING btree (user_id, created_at DESC);
  END IF;
END $$;

-- ============================================
-- 5. Clean up: Remove default values after migration
-- ============================================
-- Note: After running this migration and updating your data, you should:
-- 1. Update all existing records with proper user_id values
-- 2. Remove the DEFAULT '' from user_id columns
-- 3. Make user_id columns NOT NULL without default

-- Example cleanup (run after data migration):
-- ALTER TABLE public.intents ALTER COLUMN user_id DROP DEFAULT;
-- ALTER TABLE public.assistants ALTER COLUMN user_id DROP DEFAULT;
-- ALTER TABLE public.assistant_tests ALTER COLUMN user_id DROP DEFAULT;

