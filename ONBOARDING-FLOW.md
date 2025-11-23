# User Onboarding Flow

## Overview

New users get a step-by-step setup wizard that guides them through:
1. Adding a phone number
2. Creating intents
3. Creating an assistant
4. Launching the assistant

Each user has their own isolated dashboard with no shared data.

## Setup Wizard

The setup wizard appears on the dashboard for new users and shows:

### Step 1: Add Phone Number ✅
- User clicks "Go to Add Phone Number"
- Redirects to `/dashboard/phone-numbers`
- User can:
  - Create a free US phone number
  - Import a number from Twilio
- Once completed, step 1 is marked as complete

### Step 2: Create Intents ✅
- User clicks "Go to Create Intents"
- Redirects to `/dashboard/intents`
- User creates custom intents with:
  - Intent name
  - Example user phrases
  - English responses
  - Russian responses
- Once at least one intent is created, step 2 is marked as complete

### Step 3: Create Assistant ✅
- User clicks "Create Assistant" button
- System automatically:
  - Fetches user's intents
  - Creates VAPI assistant with those intents
  - Saves assistant to database with `user_id`
- Step 3 is marked as complete

### Step 4: Launch Assistant ✅
- User clicks "Launch Assistant" button
- System automatically:
  - Links phone number to assistant in VAPI
  - Updates phone number configuration
  - Activates the phone number for inbound calls
- Step 4 is marked as complete
- Wizard disappears, showing "Setup Complete!"

## User Journey Example

### New User Signs Up

1. **First Login**
   - User sees empty dashboard
   - Setup wizard appears at the top
   - All steps show as incomplete

2. **Step 1: Add Phone Number**
   ```
   User → Phone Numbers page → Create Free Number
   → VAPI creates number → Saved to database with user_id
   → Step 1 ✅ Complete
   ```

3. **Step 2: Create Intents**
   ```
   User → Intents page → Create Intent
   → Intent saved with user_id
   → Step 2 ✅ Complete
   ```

4. **Step 3: Create Assistant**
   ```
   User → Dashboard → Click "Create Assistant"
   → API fetches user's intents
   → Creates VAPI assistant with intents
   → Saves to database with user_id
   → Step 3 ✅ Complete
   ```

5. **Step 4: Launch Assistant**
   ```
   User → Dashboard → Click "Launch Assistant"
   → API links phone number to assistant in VAPI
   → Phone number configured for inbound calls
   → Step 4 ✅ Complete
   → Wizard disappears
   ```

6. **Assistant is Live!**
   - Phone number is active
   - Inbound calls use user's assistant
   - Assistant responds using user's intents
   - User sees their own dashboard with their data

## API Endpoints

### Create Default Assistant
```
POST /api/assistants/create-default
```
- Automatically creates an assistant for the user
- Uses all of the user's intents
- Returns the created assistant

### Launch Assistant
```
POST /api/assistants/launch
Body: {
  phoneNumberId: string,
  assistantId: string
}
```
- Links phone number to assistant in VAPI
- Updates phone number configuration
- Activates inbound calls

## Data Isolation

### Each User Has:
- ✅ Their own phone numbers (filtered by `user_id`)
- ✅ Their own intents (filtered by `user_id`)
- ✅ Their own assistants (filtered by `user_id`)
- ✅ Their own phone number → assistant mappings

### New User Experience:
- Empty dashboard (no shared data)
- Setup wizard guides them step-by-step
- Each step builds on the previous
- Complete isolation from other users

## Setup Wizard Component

The `SetupWizard` component:
- Checks setup status on mount
- Shows progress for each step
- Provides action buttons for incomplete steps
- Auto-hides when all steps are complete
- Refreshes status after each action

## Phone Numbers Page Integration

The phone numbers page now:
- Shows "Launch Assistant" instead of "Configure Assistant"
- Uses the launch API endpoint
- Provides better user feedback
- Shows loading states during launch

## Complete Flow Diagram

```
New User Signs Up
    ↓
Login to Dashboard
    ↓
See Setup Wizard (all steps incomplete)
    ↓
┌─────────────────────────────────────┐
│ Step 1: Add Phone Number            │
│ → /dashboard/phone-numbers          │
│ → Create/Import number               │
│ → Saved with user_id                │
│ ✅ Step 1 Complete                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Step 2: Create Intents               │
│ → /dashboard/intents                 │
│ → Create custom intents              │
│ → Saved with user_id                │
│ ✅ Step 2 Complete                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Step 3: Create Assistant            │
│ → Click "Create Assistant"           │
│ → API: /assistants/create-default   │
│ → Uses user's intents               │
│ → Saved with user_id                │
│ ✅ Step 3 Complete                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│ Step 4: Launch Assistant            │
│ → Click "Launch Assistant"          │
│ → API: /assistants/launch           │
│ → Links phone to assistant in VAPI │
│ → Activates inbound calls           │
│ ✅ Step 4 Complete                   │
└─────────────────────────────────────┘
    ↓
Setup Complete! 🎉
    ↓
Assistant is Live
    ↓
Inbound calls → User's assistant → User's intents
```

## Features

### ✅ Automatic Assistant Creation
- No need to manually configure assistant
- Uses all user's intents automatically
- One-click creation

### ✅ One-Click Launch
- Links phone number to assistant
- Configures VAPI for inbound calls
- Activates immediately

### ✅ Progress Tracking
- Visual progress indicators
- Step-by-step guidance
- Clear completion status

### ✅ Empty State Handling
- New users see empty dashboard
- No confusion with other users' data
- Clean starting point

## Summary

- **New users** see a setup wizard guiding them through 4 steps
- **Each step** is isolated and user-specific
- **Assistant creation** is automatic using user's intents
- **Launch** is one-click activation
- **Complete isolation** - each user has their own everything
- **No shared data** - users start with empty dashboards

This creates a seamless onboarding experience where new users can get their assistant up and running in minutes!

