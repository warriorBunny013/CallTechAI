# CallTechAI Architecture: Clerk + Supabase Integration

## Overview

This application uses **Clerk** for authentication and **Supabase** for data storage. Each Clerk user has their own isolated data in Supabase tables.

## How It Works

### 1. User Authentication Flow

```
User Signs In → Clerk Authentication → Clerk User ID → Supabase Queries Filtered by User ID
```

1. User logs in through Clerk (email/password, OAuth, etc.)
2. Clerk authenticates and provides a **User ID** (e.g., `user_2abc123xyz`)
3. This User ID is stored in Clerk's system and returned to our app via `auth()` from `@clerk/nextjs/server`
4. All Supabase queries filter by this `user_id` to ensure data isolation

### 2. Data Isolation Pattern

**Every table that stores user-specific data has a `user_id` column:**

```sql
-- Example: Intents table
CREATE TABLE intents (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Clerk User ID
  intent_name TEXT,
  ...
);

-- All queries filter by user_id:
SELECT * FROM intents WHERE user_id = 'user_2abc123xyz';
```

### 3. Clerk User ID Format

Clerk User IDs look like:
- `user_2abc123xyz456`
- `user_2def789uvw012`

These are **strings**, not UUIDs, so we use `VARCHAR(255)` in Supabase.

### 4. Table Relationships

```
┌─────────────────┐
│  Clerk Users    │  (External - Clerk manages this)
│  - user_id      │
│  - email        │
│  - name         │
└────────┬────────┘
         │
         │ user_id (Clerk User ID)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│                    Supabase Tables                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────────┐      ┌──────────────────┐        │
│  │   subscriptions │      │     intents       │        │
│  │   - user_id ────┼──────┼──► user_id        │        │
│  │   - status      │      │   - intent_name  │        │
│  │   - plan_type    │      │   - responses    │        │
│  └─────────────────┘      └──────────────────┘        │
│                                                         │
│  ┌─────────────────┐      ┌──────────────────┐        │
│  │assistant_settings│     │    assistants    │        │
│  │   - user_id ────┼──────┼──► user_id        │        │
│  │   - is_active    │      │   - vapi_id      │        │
│  └─────────────────┘      └──────────────────┘        │
│                                                         │
│  ┌─────────────────┐                                    │
│  │ assistant_tests │                                    │
│  │   - user_id     │                                    │
│  │   - test_phrase │                                    │
│  └─────────────────┘                                    │
└─────────────────────────────────────────────────────────┘
```

**Note**: We cannot create actual foreign keys to Clerk (it's external), but we use `user_id` as a logical foreign key.

## Database Schema

### Core Tables

#### 1. `subscriptions`
Stores user subscription information from Stripe.

```sql
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL UNIQUE,  -- Clerk User ID
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50),
  plan_type VARCHAR(20),
  billing_cycle VARCHAR(10),
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
```

**Relationship**: One subscription per user (1:1)

#### 2. `intents`
Stores user's custom intents for the AI assistant.

```sql
CREATE TABLE intents (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Clerk User ID
  intent_name TEXT NOT NULL,
  example_user_phrases TEXT[] NOT NULL,
  english_responses TEXT[] NOT NULL,
  russian_responses TEXT[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_intents_user_id ON intents(user_id);
CREATE INDEX idx_intents_user_created ON intents(user_id, created_at DESC);
```

**Relationship**: Many intents per user (1:many)

#### 3. `assistant_settings`
Stores per-user assistant configuration.

```sql
CREATE TABLE assistant_settings (
  user_id VARCHAR(255) PRIMARY KEY,  -- Clerk User ID (also the primary key)
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index (redundant since it's PK, but kept for consistency)
CREATE INDEX idx_assistant_settings_user_id ON assistant_settings(user_id);
```

**Relationship**: One settings record per user (1:1)

#### 4. `assistants` (if used)
Stores VAPI assistant configurations per user.

```sql
CREATE TABLE assistants (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Clerk User ID
  vapi_assistant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,
  intents_used UUID[] NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, vapi_assistant_id)  -- One assistant per user per VAPI ID
);

-- Indexes
CREATE INDEX idx_assistants_user_id ON assistants(user_id);
CREATE INDEX idx_assistants_user_created ON assistants(user_id, created_at DESC);
```

**Relationship**: Many assistants per user (1:many)

#### 5. `assistant_tests` (if used)
Stores test results for assistants.

```sql
CREATE TABLE assistant_tests (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Clerk User ID
  assistant_id VARCHAR(255) NOT NULL,
  test_phrase TEXT NOT NULL,
  language VARCHAR(50) DEFAULT 'english',
  call_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'initiated',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_assistant_tests_user_id ON assistant_tests(user_id);
CREATE INDEX idx_assistant_tests_user_created ON assistant_tests(user_id, created_at DESC);
```

**Relationship**: Many tests per user (1:many)

## API Flow Example

### Example: Creating an Intent

```typescript
// 1. User is authenticated via Clerk
const { userId } = await auth();  // Returns: "user_2abc123xyz"

// 2. API route filters by user_id
export async function POST(request: NextRequest) {
  const { userId } = await auth();
  
  // 3. Insert with user_id
  const { data } = await supabase
    .from('intents')
    .insert({
      user_id: userId,  // "user_2abc123xyz"
      intent_name: "greeting",
      // ... other fields
    });
}

// 4. When fetching, filter by user_id
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  
  const { data } = await supabase
    .from('intents')
    .select('*')
    .eq('user_id', userId);  // Only get this user's intents
}
```

## Security Model

### Row-Level Security (RLS) - Recommended

For additional security, you can enable Row-Level Security in Supabase:

```sql
-- Enable RLS on intents table
ALTER TABLE intents ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own intents
CREATE POLICY "Users can view own intents"
  ON intents FOR SELECT
  USING (auth.jwt() ->> 'sub' = user_id);

-- Policy: Users can only insert their own intents
CREATE POLICY "Users can insert own intents"
  ON intents FOR INSERT
  WITH CHECK (auth.jwt() ->> 'sub' = user_id);

-- Similar policies for UPDATE and DELETE
```

**Note**: For RLS to work with Clerk, you need to:
1. Set up Supabase Auth to sync with Clerk (using Clerk webhooks)
2. Or use a service role key in your API routes (current approach)

### Current Security Approach

We use **application-level security**:
- All API routes check authentication via Clerk's `auth()`
- All queries filter by `user_id` from Clerk
- Users cannot access other users' data because they can't modify the `user_id` in queries

## Data Flow Diagram

```
┌──────────────┐
│   Browser    │
│  (User App)  │
└──────┬───────┘
       │
       │ HTTP Request (with Clerk session cookie)
       ▼
┌─────────────────────────────────────┐
│      Next.js API Route               │
│  ┌──────────────────────────────┐   │
│  │ const { userId } = auth()    │   │
│  │ // Gets: "user_2abc123xyz"   │   │
│  └───────────┬──────────────────┘   │
│              │                       │
│              │ userId                │
│              ▼                       │
│  ┌──────────────────────────────┐   │
│  │ supabase.from('intents')     │   │
│  │   .eq('user_id', userId)     │   │
│  └───────────┬──────────────────┘   │
└──────────────┼───────────────────────┘
               │
               │ SQL Query with WHERE user_id = 'user_2abc123xyz'
               ▼
┌─────────────────────────────────────┐
│         Supabase Database           │
│  ┌──────────────────────────────┐  │
│  │ SELECT * FROM intents        │  │
│  │ WHERE user_id = 'user_...'    │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## Best Practices

### 1. Always Filter by user_id

```typescript
// ✅ GOOD
const { data } = await supabase
  .from('intents')
  .select('*')
  .eq('user_id', userId);

// ❌ BAD - Exposes all users' data
const { data } = await supabase
  .from('intents')
  .select('*');
```

### 2. Verify Ownership on Updates/Deletes

```typescript
// ✅ GOOD - Verify ownership first
const { data: existing } = await supabase
  .from('intents')
  .select('id')
  .eq('id', intentId)
  .eq('user_id', userId)  // Verify it belongs to user
  .single();

if (!existing) {
  return NextResponse.json({ error: 'Not found' }, { status: 404 });
}

// Then update
await supabase
  .from('intents')
  .update({ ... })
  .eq('id', intentId)
  .eq('user_id', userId);  // Double-check in update too
```

### 3. Use TypeScript Types

```typescript
interface Intent {
  id: string;
  user_id: string;  // Clerk User ID
  intent_name: string;
  // ...
}
```

## Testing Multi-User Isolation

1. **Create two test accounts** in Clerk
2. **Log in as User A**, create some intents
3. **Log in as User B**, verify you see no intents
4. **Create intents as User B**, verify User A doesn't see them
5. **Try to access User A's intent ID as User B** - should fail

## Troubleshooting

### Issue: Users seeing each other's data

**Check:**
1. Are all API routes using `auth()` to get `userId`?
2. Are all queries filtering by `.eq('user_id', userId)`?
3. Is the `user_id` column present in all tables?

### Issue: Foreign key errors

**Note:** You cannot create actual foreign keys to Clerk (external service). Use `user_id` as a logical foreign key and enforce relationships in application code.

### Issue: Migration errors

**Solution:** The migration file handles missing tables gracefully. Run it step by step if needed.

## Summary

- **Clerk** = Authentication (provides `user_id`)
- **Supabase** = Data storage (stores data with `user_id`)
- **Connection** = `user_id` column in every table links to Clerk User ID
- **Isolation** = All queries filter by `user_id` to ensure data separation
- **Security** = Application-level filtering + authentication checks

Every user's dashboard shows only their data because every query includes `WHERE user_id = <their_clerk_user_id>`.

