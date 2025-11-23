# Multi-User Dashboard Migration Guide

This guide explains the changes made to enable separate dashboard contents for each user.

## 📚 Related Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Complete architecture explanation
- **[DATABASE-SCHEMA.md](./DATABASE-SCHEMA.md)** - Database schema with relationships
- **[lib/user-connection.ts](./lib/user-connection.ts)** - Code examples showing the connection

## Overview

Previously, all users shared the same data. Now, each user has their own isolated data:
- Each user sees only their own intents
- Each user has their own assistant settings
- All data is scoped by Clerk user ID

## Database Changes

### Migration SQL

Run the migration SQL file to update your database schema:

```bash
# In your Supabase SQL editor, run:
migrations/add_user_id_to_tables.sql
```

### Tables Updated

1. **`intents`** - Added `user_id` column
   - All intents are now scoped to users
   - Indexes added for efficient user-based queries

2. **`assistant_settings`** - Changed to per-user
   - Primary key changed from `id` to `user_id`
   - Each user has their own assistant settings
   - Removed the global `id` column

3. **`assistants`** - Added `user_id` column (if keeping this table)
   - Unique constraint updated to be per-user

4. **`assistant_tests`** - Added `user_id` column (if keeping this table)

5. **`subscriptions`** - Already had `user_id` ✓ (no changes needed)

## API Changes

All API routes now:
1. Authenticate using Clerk's `auth()` function
2. Filter queries by `user_id`
3. Return 401 Unauthorized if user is not authenticated

### Updated API Routes

- ✅ `/api/intents` - GET, POST (filtered by user_id)
- ✅ `/api/intents/[id]` - PUT, DELETE (verify ownership)
- ✅ `/api/assistant-status` - GET, POST (per-user settings)
- ✅ `/api/dashboard-stats` - GET (user-scoped stats)
- ✅ `/api/analytics` - GET (user-scoped analytics)
- ✅ `/api/seed` - POST (seeds data for current user only)
- ✅ `/api/test-intents` - GET (test route, user-scoped)

## Important Notes

### Data Migration

After running the SQL migration:

1. **Existing Data**: All existing records will have `user_id = ''` (empty string) by default
2. **Manual Update Required**: You'll need to manually update existing records with proper user IDs, or delete them
3. **New Users**: All new records will automatically have the correct `user_id` from Clerk

### Example: Updating Existing Data

If you have existing data that needs to be assigned to users:

```sql
-- Example: Assign all intents to a specific user
UPDATE intents 
SET user_id = 'user_xxxxxxxxxxxxx' 
WHERE user_id = '';

-- Or delete all unassigned data
DELETE FROM intents WHERE user_id = '';
DELETE FROM assistant_settings WHERE user_id = '';
```

### Removing Default Values

After migrating your data, you can remove the default empty string values:

```sql
-- Remove defaults and make user_id required
ALTER TABLE intents ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE assistants ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE assistant_tests ALTER COLUMN user_id DROP DEFAULT;
```

## Testing

1. **Create a test user** in Clerk
2. **Log in** and create some intents
3. **Log in as a different user** - you should see no intents
4. **Create intents as the second user** - they should be separate from the first user's intents

## Security

- All API routes now require authentication
- Users can only access their own data
- Database queries include `.eq('user_id', userId)` filters
- Update/Delete operations verify ownership before allowing changes

## Rollback

If you need to rollback:

1. Remove `user_id` filters from API routes
2. Revert database schema changes
3. Note: This will cause all users to see shared data again

## Questions?

If you encounter any issues:
1. Check that the migration SQL ran successfully
2. Verify that Clerk authentication is working
3. Check browser console and server logs for errors
4. Ensure all API routes are using the updated code

