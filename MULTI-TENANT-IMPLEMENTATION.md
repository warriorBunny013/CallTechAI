# Multi-Tenant Implementation Summary

## 1. Supabase schema (SQL)

- **`migrations/multi_tenant_organisations_schema.sql`**
  - **organisations**: `id`, `name`, `selected_voice_agent_id`, timestamps
  - **organisation_members**: `organisation_id`, `user_id` (auth.users), `role` (owner/admin/member)
  - **organisation_id** added to: `phone_numbers`, `intents`, `assistant_settings`, `working_hours`, `subscriptions`, `calls`, `assistants` (if exists)
  - Backfill: one organisation per existing profile, then set `organisation_id` on all related rows
  - **organisation_calendar_connections**: OAuth tokens per org
  - **appointments**: `organisation_id`, `calendar_event_id`, `start_at`, `end_at`, customer info, optional `call_id`

- **`migrations/multi_tenant_rls_organisation.sql`**
  - RLS on all org-scoped tables: access allowed iff `organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())`
  - Helper: `public.user_organisation_ids()`

**Run order:**  
1) `multi_tenant_organisations_schema.sql`  
2) `multi_tenant_rls_organisation.sql`

---

## 2. High-level architecture

- **Tenant boundary:** `organisation_id`. Users see only data for organisations they belong to (via `organisation_members`).
- **Twilio:** Incoming call → webhook with **To** = clinic number, **From** = caller. Lookup `phone_numbers` by **To** (E.164) → get `organisation_id`, then build Vapi call with org’s intents + voice agent.
- **Vapi:** Transient assistant per call (no pre-created assistant in Vapi): system prompt from org intents, voice from org’s `selected_voice_agent_id`. Metadata includes `organisation_id` for the completion webhook.
- **Dashboard:** All APIs use `getCurrentUserAndOrg()` and filter by `organisation_id`. Calls/recordings/analytics come from Supabase `calls` table, not Vapi API.
- **Google Calendar:** OAuth per org, tokens in `organisation_calendar_connections`. Free/busy and event create via Calendar API.

See **ARCHITECTURE-MULTI-TENANT.md** for the full diagram and flow.

---

## 3. Twilio incoming call API

- **File:** `app/api/webhooks/twilio/route.ts`
- **Flow:**
  1. Parse `To` (clinic number) and `From` (caller). Normalise `To` to E.164.
  2. Look up `phone_numbers` by `phone_number = To`, `is_active = true` (using **service** Supabase so RLS doesn’t block).
  3. If no row or no `organisation_id` → return TwiML “not registered” / “not configured”.
  4. Load org’s `selected_voice_agent_id` and intents from Supabase.
  5. Build **transient assistant** with `lib/vapi-call.ts` (intents + voice agent).
  6. `POST` to Vapi `/v1/call` with `type: "inboundPhoneCall"`, `assistant`, `customer: { number: From }`, `phoneNumberId`, `metadata: { organisation_id, phone_number_id, ... }`.
  7. Insert into `calls` with `organisation_id` (service client).

---

## 4. Vapi call initiation (transient assistant)

- **File:** `lib/vapi-call.ts`
- **Function:** `buildTransientAssistant(voiceAgentId, intents)` → Vapi `assistant` object:
  - System prompt: base from voice agent + block of org intents (name, example phrases, English/Russian responses).
  - Voice and model from selected voice agent template (or default).
- Used in Twilio webhook to avoid storing assistants in Vapi; each call gets the correct org intents and voice.

---

## 5. Google Calendar booking

- **Schema:** `organisation_calendar_connections` (tokens per org), `appointments` (event id, times, customer, optional `call_id`).
- **OAuth:**  
  - **GET /api/calendar/connect** → redirect to Google with `state = organisation_id`.  
  - **GET /api/calendar/callback** → exchange code, upsert tokens for that org (service client).
- **Free/busy:** **GET /api/calendar/freebusy?timeMin=&timeMax=** → uses org’s tokens (refresh if needed), calls Calendar API `freeBusy.query`.
- **Create appointment:** **POST /api/calendar/appointments** with `summary`, `start`, `end`, optional `description`, `customer_phone`, `customer_name`, `call_id` → create event via Calendar API, then insert row in `appointments` (service client for insert).
- **Lib:** `lib/google-calendar.ts` (token refresh, `queryFreeBusy`, `createCalendarEvent`).

---

## 6. Dashboard query refactor (examples)

- **Auth + org:** `const userAndOrg = await getCurrentUserAndOrg();` then `userAndOrg.organisationId`.
- **Call logs:** `supabase.from('calls').select(...).eq('organisation_id', userAndOrg.organisationId).order('created_at', { ascending: false })`.
- **Dashboard stats:** Intents count and assistant settings by `organisation_id`; recent calls from `calls` table by `organisation_id` (no Vapi API).
- **Analytics:** `calls` filtered by `organisation_id` and date range; intents by `organisation_id`.
- **Intents / phone numbers / working hours:** All GET/POST/PUT/DELETE filter or insert by `organisation_id` (and where needed still pass `user_id` for NOT NULL columns).

Refactored routes: `call-logs`, `dashboard-stats`, `analytics`, `intents`, `intents/[id]`, `phone-numbers`, `phone-numbers/[id]`, `working-hours`, `subscription-status`.

---

## Environment variables

- **Existing:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VAPI_API_KEY`, `NEXT_PUBLIC_APP_URL`, Stripe, etc.
- **Required for multi-tenant + webhooks:**
  - **`SUPABASE_SERVICE_ROLE_KEY`** – signup (org + member creation) and webhooks (Twilio, Vapi, calendar callback) so they can write without a user session.
- **Required for Google Calendar:**
  - **`GOOGLE_CLIENT_ID`**
  - **`GOOGLE_CLIENT_SECRET`**
  - Redirect URI in Google Cloud Console: `{NEXT_PUBLIC_APP_URL}/api/calendar/callback`

---

## Post-migration

1. Run both migration files in Supabase SQL Editor (in order).
2. Set `SUPABASE_SERVICE_ROLE_KEY` (and Google vars if using Calendar).
3. New signups get an organisation and membership via `complete-signup`.
4. Twilio webhook URL: `https://<your-domain>/api/webhooks/twilio` (lookup by **To** = clinic number).
5. Vapi webhook URL: `https://<your-domain>/api/webhooks/vapi`.
6. In the dashboard, allow selecting the voice agent and saving to `organisations.selected_voice_agent_id` (UI can call PATCH/PUT on an org or a small API that updates this field).
