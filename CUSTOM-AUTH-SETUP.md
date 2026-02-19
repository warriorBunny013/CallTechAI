# Custom Auth Setup (Supabase + 7-day trial)

This app uses **Supabase Auth** (email/password) instead of Clerk. Signup includes a **7-day free trial**; after trial ends users must subscribe (monthly or annual) to continue.

## 1. Run database migrations

In the **Supabase SQL Editor**, run (in order):

1. **Profiles table** (B2B signup + trial):
   ```bash
   # From project root, run the migration:
   # migrations/create_profiles_table.sql
   ```
   Copy the contents of `migrations/create_profiles_table.sql` and execute in Supabase.

2. Ensure **subscriptions** table exists (already used; `user_id` is now Supabase Auth UUID).

## 2. Supabase Auth settings

1. In **Supabase Dashboard** → **Authentication** → **Providers**:
   - Enable **Email**.
   - Optionally disable "Confirm email" for faster signup (or keep it and handle confirmation flow).

2. **Site URL**: set to your app URL (e.g. `http://localhost:3000` for dev).

## 3. Environment variables

Keep your existing Supabase env vars:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

No Clerk env vars are needed.

## 4. Flow summary

- **Signup** (`/signup`): Email, password, full name, phone, organisation name → Supabase Auth signup + row in `profiles` with `trial_ends_at = now() + 7 days`.
- **Login** (`/login`): Email + password → Supabase Auth.
- **Trial**: For 7 days after signup, user has full access.
- **After trial**: If no active Stripe subscription, user sees paywall and must go to **Subscription** (monthly or annual). After payment, full access with no usage limits.

## 5. Stripe

Existing Stripe integration is unchanged. Checkout and webhooks use `user_id` = Supabase Auth user UUID (stored in Stripe metadata and in `subscriptions.user_id`).

## 6. Troubleshooting (can't login / register)

- **Run the profiles migration first**  
  If you see "relation \"profiles\" does not exist" or profile errors, run `migrations/create_profiles_table.sql` in the Supabase SQL Editor.

- **Enable Email auth in Supabase**  
  Dashboard → Authentication → Providers → Email: turn **ON**.  
  For instant signup without email confirmation: under Email, turn **OFF** "Confirm email".

- **Check Site URL**  
  Authentication → URL Configuration → Site URL: use your app URL (e.g. `http://localhost:3000` for dev).  
  Add `http://localhost:3000` (or your URL) to Redirect URLs if you use email confirmation.

- **Env vars**  
  Ensure `.env.local` has:
  - `NEXT_PUBLIC_SUPABASE_URL` = your project URL  
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your anon/public key  

- **Login/register now use the browser**  
  Auth runs in the browser so the session is stored in cookies. If it still fails, open DevTools → Network, try login/signup, and check the failing request and response.
