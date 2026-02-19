# CallTechAI Multi-Tenant Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CALLER (customer)                                  │
│                     calls clinic number (E.164)                               │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  TWILIO  (incoming call)                                                     │
│  Webhook: To = clinic number, From = caller number                           │
│  POST /api/webhooks/twilio                                                   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  NEXT.JS API (Backend)                                                       │
│  1. Lookup phone_numbers WHERE phone_number = To (E.164)                     │
│  2. Get organisation_id, selected_voice_agent_id, intents                     │
│  3. Build transient Vapi assistant (intents + voice agent)                     │
│  4. POST Vapi /v1/call (assistant, customer, phoneNumber, metadata)          │
│  5. Insert calls row (organisation_id, ...)                                  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  VAPI AI  (handles call, uses org-specific prompt + voice)                    │
│  On end: POST /api/webhooks/vapi (metadata.organisation_id)                  │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│  BACKEND: Update calls (recording_url, transcript, organisation_id)          │
│  Service-role Supabase (bypass RLS for webhooks)                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│  DASHBOARD (authenticated user)                                              │
│  getCurrentUser() → getOrganisationIdForUser() → all queries by org_id       │
│  Calls, recordings, intents, phone numbers, agent: all from Supabase by org   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Tenant Boundary: organisation_id

- **Organisations** are the tenant root (clinic/business).
- **Users** belong to organisations via **organisation_members** (user_id, organisation_id, role).
- **Phone numbers** belong to organisations. The number stored is the **clinic number** (the number customers call = Twilio webhook **To**).
- **Intents, working_hours, calls, subscriptions, calendar** are all scoped by **organisation_id**.
- **RLS**: User can access a row iff `organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())`.

## Twilio → Backend → Vapi Call Flow

1. **Incoming call**: Customer calls clinic number. Twilio sends webhook to `/api/webhooks/twilio` with `To` = clinic number (E.164), `From` = caller number.
2. **Lookup**: Backend queries `phone_numbers` where `phone_number = To` (normalised E.164). Returns `organisation_id`, `vapi_phone_number_id`, org’s `selected_voice_agent_id` and intents.
3. **Reject if**: No matching phone number, or org has no voice agent / no Vapi config.
4. **Vapi call**: Backend builds a **transient assistant** (no pre-created assistant in Vapi):
   - System prompt = org intents (hours, services, offers, FAQs).
   - Voice = org’s selected voice agent template (one of 6).
   - POST to Vapi `POST /v1/call` with `assistant`, `customer: { number: From }`, `phoneNumberId` (or equivalent), `metadata: { organisation_id, phone_number_id }`.
5. **Storage**: Insert/update `calls` with `organisation_id`, `caller_phone_number` (From), `assistant_phone_number` (To), and later recording/transcript from Vapi webhook.

## Phone Number Semantics

- **phone_numbers.phone_number**: E.164 **clinic number** that customers dial (Twilio **To**).
- **Twilio webhook**: Lookup by **To** (clinic number), not By From (caller). One clinic number → one organisation (and one Vapi config).

## Vapi Dynamic Config

- **No per-org assistant in Vapi**: We do not create one Vapi assistant per org.
- **Transient assistant per call**: On each incoming call we build an `assistant` object from:
  - Org’s **intents** (system prompt with Q&A),
  - Org’s **selected_voice_agent_id** (one of 6 templates: voiceId, model, firstMessage).
- This is sent in the same request as `POST /v1/call` so intents and voice are injected dynamically per organisation.

## Google Calendar (Per Organisation)

- **organisation_calendar_connections**: One row per org; stores OAuth `access_token`, `refresh_token`, `token_expiry`, `calendar_id`.
- **appointments**: Created when a call books a slot; links to `organisation_id`, optional `call_id`, and Google `calendar_event_id`.
- **OAuth**: Redirect to Google, callback stores tokens for the current user’s organisation.
- **Free/busy**: Calendar API `freebusy.query` for the org’s calendar.
- **Create**: Calendar API `events.insert` and insert row in `appointments`.

## Dashboard Query Pattern

- **Resolve org**: `organisation_id = await getOrganisationIdForUser(user.id)` (e.g. first org where user is member).
- **All reads/writes**: Filter by `organisation_id` (e.g. calls, intents, phone numbers, working hours, recordings, analytics).
- **Call recordings / analytics**: Read from **Supabase `calls`** table filtered by `organisation_id`, not from Vapi API directly.

## Security

- **API routes**: Require auth; resolve `organisation_id` from current user; filter all queries by `organisation_id`.
- **Webhooks (Twilio, Vapi)**: No user session. Use **Supabase service role** for inserts/updates so RLS does not block webhook writes.
- **Secrets**: `VAPI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth client credentials in env only.

## File Reference

| Area              | Files |
|-------------------|--------|
| Schema            | `migrations/multi_tenant_organisations_schema.sql` |
| RLS               | `migrations/multi_tenant_rls_organisation.sql` |
| Org resolution    | `lib/org.ts` |
| Twilio webhook    | `app/api/webhooks/twilio/route.ts` |
| Vapi webhook      | `app/api/webhooks/vapi/route.ts` |
| Vapi call build   | `lib/vapi-call.ts` (transient assistant) |
| Dashboard APIs    | All under `app/api/` filter by `organisation_id` |
| Google Calendar   | `app/api/calendar/`, `lib/google-calendar.ts` |
