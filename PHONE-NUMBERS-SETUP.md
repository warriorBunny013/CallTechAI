# Phone Numbers & Assistant Setup Guide

## Overview

This feature allows each user to:
1. Create or import phone numbers via VAPI
2. Create assistants using their own intents
3. Link phone numbers to assistants for inbound calls
4. Have completely isolated phone numbers and assistants per user

## How It Works

### User Flow

```
1. User creates intents (their own custom responses)
   ↓
2. User creates assistant using their intents
   ↓
3. User creates/imports phone number
   ↓
4. User links phone number to assistant
   ↓
5. When someone calls that number → VAPI uses user's assistant → Uses user's intents
```

### Data Isolation

- Each user has their own:
  - ✅ Intents (custom responses)
  - ✅ Assistants (created from their intents)
  - ✅ Phone numbers (created/imported)
  - ✅ Phone number → Assistant mappings

- Users cannot see or access other users' data

## Database Schema

### phone_numbers Table

```sql
CREATE TABLE phone_numbers (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Clerk User ID
  vapi_phone_number_id VARCHAR(255) NOT NULL,  -- VAPI phone number ID
  phone_number VARCHAR(20) NOT NULL,  -- E.164 format
  country_code VARCHAR(10),
  number_type VARCHAR(20) DEFAULT 'free',  -- 'free' or 'imported'
  assistant_id UUID,  -- Links to assistants table
  vapi_assistant_id VARCHAR(255),  -- VAPI assistant ID for inbound calls
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, vapi_phone_number_id)
);
```

### assistants Table

```sql
CREATE TABLE assistants (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,  -- Clerk User ID
  vapi_assistant_id VARCHAR(255) NOT NULL,  -- VAPI assistant ID
  name VARCHAR(255) NOT NULL,
  config JSONB NOT NULL,  -- Full VAPI assistant config
  intents_used UUID[] NOT NULL,  -- Array of intent IDs used
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  UNIQUE(user_id, vapi_assistant_id)
);
```

## Setup Steps

### 1. Run Database Migration

```sql
-- Run in Supabase SQL Editor:
migrations/create_phone_numbers_table.sql
```

### 2. Environment Variables

Ensure you have:
```bash
VAPI_API_KEY=your_vapi_api_key_here
```

### 3. User Workflow

#### Step 1: Create Intents
- User goes to `/dashboard/intents`
- Creates custom intents with:
  - Intent name
  - Example user phrases
  - English responses
  - Russian responses

#### Step 2: Create Assistant
- User goes to `/dashboard/phone-numbers` (or create assistant page)
- Selects intents to use
- Creates assistant via VAPI API
- Assistant is saved to database with `user_id`

#### Step 3: Create/Import Phone Number
- User goes to `/dashboard/phone-numbers`
- Option A: Create free US number
  - Click "Create Free Number"
  - Select country code (US only for free)
  - Number is created in VAPI and saved to database
- Option B: Import from Twilio
  - Click "Import from Twilio"
  - Enter Twilio credentials:
    - Account SID
    - Auth Token
    - Phone Number SID
  - Number is imported to VAPI and saved to database

#### Step 4: Link Phone Number to Assistant
- User selects an assistant from dropdown
- Phone number is updated in VAPI with `assistantId`
- When someone calls the number:
  - VAPI routes to the user's assistant
  - Assistant uses the user's intents
  - Response is based on user's custom intents

## API Endpoints

### Phone Numbers

- `GET /api/phone-numbers` - List user's phone numbers
- `POST /api/phone-numbers` - Create/import phone number
- `PUT /api/phone-numbers/[id]` - Update phone number (set assistant)
- `DELETE /api/phone-numbers/[id]` - Delete phone number

### Assistants

- `GET /api/assistants` - List user's assistants
- `POST /api/create-assistant` - Create assistant from intents

## VAPI Integration

### Creating Free Number

```typescript
POST /v1/phone-numbers
{
  "number": "+1234567890",  // Optional, VAPI assigns if not provided
  "countryCode": "US"
}
```

### Importing from Twilio

```typescript
POST /v1/phone-numbers/import
{
  "twilioAccountSid": "AC...",
  "twilioAuthToken": "...",
  "twilioPhoneNumberSid": "PN..."
}
```

### Setting Assistant for Inbound Calls

```typescript
PATCH /v1/phone-numbers/{phoneNumberId}
{
  "assistantId": "vapi_assistant_id_here"
}
```

## Example: Complete User Journey

### User A (user1@gmail.com)

1. **Creates Intent:**
   - Name: "greeting"
   - Response: "Hello! Welcome to User A's business"

2. **Creates Assistant:**
   - Uses "greeting" intent
   - VAPI creates assistant with ID: `asst_abc123`
   - Saved to database with `user_id: "user_2abc123xyz"`

3. **Creates Phone Number:**
   - Free US number: `+1 (555) 123-4567`
   - VAPI phone number ID: `pn_xyz789`
   - Saved to database with `user_id: "user_2abc123xyz"`

4. **Links Phone to Assistant:**
   - Sets `vapi_assistant_id: "asst_abc123"` on phone number
   - VAPI updates phone number configuration

5. **Result:**
   - When someone calls `+1 (555) 123-4567`
   - VAPI uses User A's assistant
   - Assistant responds with User A's "greeting" intent
   - "Hello! Welcome to User A's business"

### User B (user2@gmail.com)

- Has completely separate:
  - Intents
  - Assistants
  - Phone numbers
- Cannot see or access User A's data
- Their phone numbers use their own assistants and intents

## Security

- ✅ All API routes require Clerk authentication
- ✅ All queries filter by `user_id`
- ✅ Users can only access their own phone numbers
- ✅ Users can only use their own assistants
- ✅ Users can only use their own intents

## Troubleshooting

### Phone number not receiving calls

1. Check if assistant is linked: `vapi_assistant_id` should be set
2. Verify assistant exists in VAPI dashboard
3. Check phone number status in VAPI dashboard

### Assistant not using correct intents

1. Verify assistant was created with correct intent IDs
2. Check `intents_used` array in assistants table
3. Verify intents belong to the same user

### Import from Twilio fails

1. Verify Twilio credentials are correct
2. Check if phone number SID is valid
3. Ensure phone number is active in Twilio

## Summary

- **Isolation**: Each user has completely separate phone numbers and assistants
- **Integration**: Phone numbers are created/imported via VAPI API
- **Configuration**: Phone numbers can be linked to user's assistants
- **Inbound Calls**: Use the linked assistant with user's intents
- **Security**: All data is scoped by `user_id` from Clerk

This creates a complete multi-tenant system where each user has their own phone number infrastructure!

