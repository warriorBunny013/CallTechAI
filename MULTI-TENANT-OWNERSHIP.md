# Multi-Tenant Call Ownership Model

## Critical Ownership Rule

**Call ownership is determined by the CALLER's clinic phone number (From field), NOT the assistant number (To field).**

This ensures that:
- Multiple users can forward to the SAME assistant number
- Each user's calls are isolated based on their clinic phone number
- Data NEVER mixes between users

## How It Works

### 1. Phone Number Registration

When a user registers their clinic phone number:

```
User enters clinic phone number: +1 (555) 123-4567
↓
Stored in phone_numbers table:
  - phone_number: "+15551234567" (clinic number)
  - user_id: "user_2abc123xyz" (owner)
  - assistant_id: UUID (optional, set later)
  - vapi_assistant_id: "asst_xyz" (optional, set later)
```

**Important**: The `phone_numbers.phone_number` field stores the **clinic number** (caller's number), NOT the assistant number.

### 2. Incoming Call Flow

When a call arrives:

```
Twilio Webhook:
  From: +1 (555) 123-4567 (caller's clinic number)
  To: +1 (555) 999-8888 (assistant number - may be shared)
↓
Lookup phone_numbers WHERE phone_number = From
↓
Found: user_id = "user_2abc123xyz"
       assistant_id = UUID
       phone_number_id = UUID
↓
Start VAPI call with metadata:
  - user_id: "user_2abc123xyz"
  - assistant_id: UUID
  - phone_number_id: UUID
  - caller_phone_number: "+15551234567"
  - assistant_phone_number: "+15559998888"
```

### 3. Call Data Storage

When VAPI callback arrives:

```
VAPI Callback:
  - metadata.user_id: "user_2abc123xyz" (from webhook)
  - recordingUrl: "https://..."
  - transcript: "..."
  - duration: 120
↓
Store in calls table:
  - user_id: "user_2abc123xyz" (from metadata)
  - caller_phone_number: "+15551234567"
  - assistant_phone_number: "+15559998888"
  - recording_url: "https://..."
  - transcript: "..."
```

## Example: Multiple Users, Same Assistant Number

### Scenario

- **User A** (clinic: +1-555-111-1111) forwards to assistant number +1-555-999-9999
- **User B** (clinic: +1-555-222-2222) forwards to assistant number +1-555-999-9999

### Call from User A's Clinic

```
Twilio Webhook:
  From: +15551111111 (User A's clinic)
  To: +15559999999 (shared assistant number)
↓
Lookup: phone_numbers WHERE phone_number = "+15551111111"
↓
Result: user_id = "user_a", assistant_id = "asst_123"
↓
VAPI Call with metadata:
  user_id: "user_a"
  caller_phone_number: "+15551111111"
  assistant_phone_number: "+15559999999"
↓
VAPI Callback stores:
  user_id: "user_a"
  → User A sees this call in their dashboard
```

### Call from User B's Clinic

```
Twilio Webhook:
  From: +15552222222 (User B's clinic)
  To: +15559999999 (shared assistant number)
↓
Lookup: phone_numbers WHERE phone_number = "+15552222222"
↓
Result: user_id = "user_b", assistant_id = "asst_456"
↓
VAPI Call with metadata:
  user_id: "user_b"
  caller_phone_number: "+15552222222"
  assistant_phone_number: "+15559999999"
↓
VAPI Callback stores:
  user_id: "user_b"
  → User B sees this call in their dashboard
```

**Result**: Both users see ONLY their own calls, even though they use the same assistant number.

## Database Schema

### phone_numbers Table

```sql
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Owner of this clinic number
  phone_number VARCHAR(20) NOT NULL,  -- CLINIC NUMBER (caller's number)
  assistant_id UUID,  -- Assistant to use for this clinic number
  vapi_assistant_id VARCHAR(255),  -- VAPI assistant ID
  ...
);
```

**Key Point**: `phone_number` = clinic number (caller's number), NOT assistant number.

### calls Table

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Determined by caller_phone_number lookup
  caller_phone_number VARCHAR(20) NOT NULL,  -- From field (clinic number)
  assistant_phone_number VARCHAR(20),  -- To field (may be shared)
  recording_url TEXT,
  transcript TEXT,
  ...
);
```

**Key Point**: `user_id` is determined by looking up `caller_phone_number` in `phone_numbers` table.

## Security Guarantees

### 1. Call Ownership

- ✅ Ownership determined by caller's clinic number (From field)
- ✅ Lookup in `phone_numbers` table by `phone_number = From`
- ✅ Extract `user_id` from matching record
- ✅ Reject calls if no matching phone number exists

### 2. Data Isolation

- ✅ All call data stored with `user_id` from metadata
- ✅ RLS policies enforce `user_id = auth.uid()`
- ✅ Frontend queries automatically filter by `user_id`
- ✅ Users cannot access other users' data

### 3. Shared Assistant Numbers

- ✅ Multiple users can use same assistant number
- ✅ Each call is isolated by caller's clinic number
- ✅ No data mixing between users
- ✅ Each user sees only their own calls

## Implementation Files

### Webhook Handlers

1. **`/app/api/webhooks/twilio/route.ts`**
   - Handles incoming Twilio webhooks
   - Looks up user by caller's phone number (From field)
   - Starts VAPI call with metadata including `user_id`

2. **`/app/api/webhooks/vapi/route.ts`**
   - Handles VAPI callbacks
   - Extracts `user_id` from metadata
   - Stores call data with correct `user_id`

### Database Migrations

1. **`migrations/create_calls_table.sql`**
   - Creates calls table with `user_id` column
   - Stores caller and assistant phone numbers separately

2. **`migrations/create_rls_policies.sql`**
   - Enables RLS on all tables
   - Creates policies enforcing `user_id = auth.uid()`

## Testing the Ownership Model

### Test Case 1: Single User

1. User A registers clinic number: +1-555-111-1111
2. User A configures assistant: asst_123
3. Call comes from +1-555-111-1111
4. **Expected**: Call stored with `user_id = user_a`
5. **Verify**: User A sees call in dashboard, User B does not

### Test Case 2: Shared Assistant Number

1. User A registers clinic: +1-555-111-1111 → assistant +1-555-999-9999
2. User B registers clinic: +1-555-222-2222 → assistant +1-555-999-9999
3. Call from +1-555-111-1111 to +1-555-999-9999
4. **Expected**: Call stored with `user_id = user_a`
5. Call from +1-555-222-2222 to +1-555-999-9999
6. **Expected**: Call stored with `user_id = user_b`
7. **Verify**: Each user sees only their own calls

### Test Case 3: Unregistered Number

1. Call comes from +1-555-999-9999 (not registered)
2. **Expected**: Call rejected, no record created
3. **Verify**: No call appears in any dashboard

## Common Mistakes to Avoid

### ❌ DON'T: Use assistant number for ownership

```typescript
// WRONG - Don't do this
const { data } = await supabase
  .from('phone_numbers')
  .select('user_id')
  .eq('phone_number', assistantPhoneNumber) // WRONG!
```

### ✅ DO: Use caller's clinic number for ownership

```typescript
// CORRECT - Do this
const { data } = await supabase
  .from('phone_numbers')
  .select('user_id')
  .eq('phone_number', callerPhoneNumber) // CORRECT!
```

### ❌ DON'T: Store assistant number as clinic number

```typescript
// WRONG - Don't do this
await supabase.from('phone_numbers').insert({
  phone_number: assistantNumber, // WRONG - this is assistant number!
  user_id: userId
});
```

### ✅ DO: Store clinic number as clinic number

```typescript
// CORRECT - Do this
await supabase.from('phone_numbers').insert({
  phone_number: clinicNumber, // CORRECT - this is caller's clinic number!
  user_id: userId
});
```

## Summary

1. **Ownership Source**: Caller's clinic phone number (From field)
2. **Lookup**: `phone_numbers.phone_number = From`
3. **Metadata**: Pass `user_id` in VAPI call metadata
4. **Storage**: Store all call data with `user_id` from metadata
5. **Isolation**: RLS policies enforce `user_id = auth.uid()`
6. **Sharing**: Multiple users can share assistant numbers safely

This model ensures complete data isolation while allowing flexible assistant number sharing.

