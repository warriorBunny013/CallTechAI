# Database Schema Reference

## Overview

This document shows the complete database schema with Clerk user relationships.

## Table Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLERK (External)                        │
│                                                                   │
│  User Record:                                                     │
│    - user_id: "user_2abc123xyz"  ← Unique Clerk identifier       │
│    - email: "user1@gmail.com"                                     │
│    - name: "John Doe"                                             │
│                                                                   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             │ user_id (logical foreign key)
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE DATABASE                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ subscriptions                                            │   │
│  │ ──────────────────────────────────────────────────────── │   │
│  │ id: UUID (PK)                                            │   │
│  │ user_id: VARCHAR(255) NOT NULL UNIQUE ←──┐              │   │
│  │ stripe_customer_id: VARCHAR(255)          │              │   │
│  │ stripe_subscription_id: VARCHAR(255)      │              │   │
│  │ status: VARCHAR(50)                       │              │   │
│  │ plan_type: VARCHAR(20)                    │              │   │
│  │ billing_cycle: VARCHAR(10)                │              │   │
│  │ current_period_start: TIMESTAMP          │              │   │
│  │ current_period_end: TIMESTAMP             │              │   │
│  │ created_at: TIMESTAMP                    │              │   │
│  │ updated_at: TIMESTAMP                    │              │   │
│  │                                            │              │   │
│  │ Relationship: 1 Clerk User → 1 Subscription (1:1)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ intents                                                 │   │
│  │ ──────────────────────────────────────────────────────── │   │
│  │ id: UUID (PK)                                            │   │
│  │ user_id: VARCHAR(255) NOT NULL ←───────────────────────┤   │
│  │ intent_name: TEXT NOT NULL                              │   │
│  │ example_user_phrases: TEXT[] NOT NULL                   │   │
│  │ english_responses: TEXT[] NOT NULL                      │   │
│  │ russian_responses: TEXT[] NOT NULL                      │   │
│  │ created_at: TIMESTAMP                                  │   │
│  │                                                          │   │
│  │ Indexes:                                                 │   │
│  │   - idx_intents_user_id (user_id)                       │   │
│  │   - idx_intents_user_created (user_id, created_at DESC) │   │
│  │                                                          │   │
│  │ Relationship: 1 Clerk User → Many Intents (1:many)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ assistant_settings                                      │   │
│  │ ──────────────────────────────────────────────────────── │   │
│  │ user_id: VARCHAR(255) NOT NULL (PK) ←──────────────────┤   │
│  │ is_active: BOOLEAN DEFAULT true                          │   │
│  │ created_at: TIMESTAMP DEFAULT NOW()                     │   │
│  │ updated_at: TIMESTAMP DEFAULT NOW()                      │   │
│  │                                                           │   │
│  │ Indexes:                                                  │   │
│  │   - idx_assistant_settings_user_id (user_id) [PK]        │   │
│  │                                                           │   │
│  │ Relationship: 1 Clerk User → 1 Settings (1:1)           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ assistants (if used)                                    │   │
│  │ ──────────────────────────────────────────────────────── │   │
│  │ id: UUID (PK)                                            │   │
│  │ user_id: VARCHAR(255) NOT NULL ←────────────────────────┤   │
│  │ vapi_assistant_id: VARCHAR(255) NOT NULL                │   │
│  │ name: VARCHAR(255) NOT NULL                              │   │
│  │ config: JSONB NOT NULL                                   │   │
│  │ intents_used: UUID[] NOT NULL                            │   │
│  │ created_at: TIMESTAMP                                    │   │
│  │ updated_at: TIMESTAMP                                    │   │
│  │                                                           │   │
│  │ Constraints:                                              │   │
│  │   - UNIQUE(user_id, vapi_assistant_id)                    │   │
│  │                                                           │   │
│  │ Indexes:                                                  │   │
│  │   - idx_assistants_user_id (user_id)                     │   │
│  │   - idx_assistants_user_created (user_id, created_at)    │   │
│  │                                                           │   │
│  │ Relationship: 1 Clerk User → Many Assistants (1:many)   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ assistant_tests (if used)                              │   │
│  │ ──────────────────────────────────────────────────────── │   │
│  │ id: UUID (PK)                                            │   │
│  │ user_id: VARCHAR(255) NOT NULL ←────────────────────────┤   │
│  │ assistant_id: VARCHAR(255) NOT NULL                     │   │
│  │ test_phrase: TEXT NOT NULL                               │   │
│  │ language: VARCHAR(50) DEFAULT 'english'                │   │
│  │ call_id: VARCHAR(255)                                   │   │
│  │ status: VARCHAR(50) DEFAULT 'initiated'                  │   │
│  │ created_at: TIMESTAMP                                   │   │
│  │ updated_at: TIMESTAMP                                   │   │
│  │                                                          │   │
│  │ Indexes:                                                 │   │
│  │   - idx_assistant_tests_user_id (user_id)               │   │
│  │   - idx_assistant_tests_user_created (user_id, created) │   │
│  │                                                          │   │
│  │ Relationship: 1 Clerk User → Many Tests (1:many)        │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Key Points

### 1. user_id Column
- **Type**: `VARCHAR(255)`
- **Format**: Clerk User ID (e.g., `"user_2abc123xyz"`)
- **Purpose**: Links all user data to their Clerk authentication
- **Location**: Present in ALL user-specific tables

### 2. Relationships

| Table | Relationship | Description |
|-------|-------------|-------------|
| `subscriptions` | 1:1 | One subscription per user |
| `assistant_settings` | 1:1 | One settings record per user (user_id is PK) |
| `intents` | 1:many | One user can have many intents |
| `assistants` | 1:many | One user can have many assistants |
| `assistant_tests` | 1:many | One user can have many tests |

### 3. Indexes

All tables have indexes on `user_id` for fast lookups:
- `idx_<table>_user_id` - Single column index
- `idx_<table>_user_created` - Composite index for sorted queries

### 4. Query Pattern

**Every query follows this pattern:**

```sql
-- Get user's data
SELECT * FROM <table>
WHERE user_id = 'user_2abc123xyz';

-- Create user's data
INSERT INTO <table> (user_id, ...)
VALUES ('user_2abc123xyz', ...);

-- Update user's data
UPDATE <table>
SET ...
WHERE user_id = 'user_2abc123xyz' AND id = '...';

-- Delete user's data
DELETE FROM <table>
WHERE user_id = 'user_2abc123xyz' AND id = '...';
```

## Example Data Flow

### Scenario: User creates an intent

1. **User Action**: User clicks "Create Intent" in dashboard
2. **Frontend**: Sends POST to `/api/intents`
3. **API Route**:
   ```typescript
   const { userId } = await auth();  // Gets: "user_2abc123xyz"
   ```
4. **Database Insert**:
   ```sql
   INSERT INTO intents (user_id, intent_name, ...)
   VALUES ('user_2abc123xyz', 'greeting', ...);
   ```
5. **Result**: Intent is linked to this user via `user_id`

### Scenario: User views dashboard

1. **User Action**: User opens dashboard
2. **API Route**: `/api/dashboard-stats`
3. **Query**:
   ```sql
   SELECT COUNT(*) FROM intents
   WHERE user_id = 'user_2abc123xyz';
   ```
4. **Result**: Only this user's intents are counted

## Data Isolation Guarantee

**How we ensure users only see their data:**

1. ✅ All API routes require authentication (`auth()`)
2. ✅ All queries filter by `user_id` from Clerk
3. ✅ Update/Delete operations verify ownership
4. ✅ No queries can access other users' `user_id` values

**Example:**
```typescript
// User A's Clerk ID: "user_2abc123xyz"
// User B's Clerk ID: "user_2def789uvw"

// When User A queries:
const { userId } = await auth();  // Returns: "user_2abc123xyz"
const { data } = await supabase
  .from('intents')
  .eq('user_id', userId);  // Only gets User A's intents

// User A cannot access User B's data because:
// - userId is always "user_2abc123xyz" for User A
// - Cannot be changed or manipulated
// - All queries automatically filter by this value
```

## Migration Notes

After running the migration:
- All tables have `user_id` column
- All indexes are created for performance
- Existing data will have `user_id = ''` (empty string)
- **Action Required**: Update or delete existing data with empty `user_id`

## Summary

- **Connection**: `user_id` column in every table
- **Source**: Clerk User ID from `auth()` function
- **Isolation**: All queries filter by `user_id`
- **Security**: Application-level filtering + authentication
- **Relationship**: Logical foreign key (cannot use DB foreign keys to external Clerk)

This architecture ensures each user has a completely isolated dashboard with their own data.

