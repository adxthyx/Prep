# Prep Supabase setup

1. Open the Supabase SQL Editor and run [`supabase/schema.sql`](supabase/schema.sql) once. The script is idempotent and also adds `prep_state` to the `supabase_realtime` publication.
2. In Authentication → Providers, keep Email enabled. Decide whether new accounts must confirm their email.
3. In Authentication → URL Configuration, set the Site URL to `https://adithyaholla.com/prep` and add these redirect URLs:
   - `https://adithyaholla.com/prep/**`
   - `http://localhost:5173/prep/**`
4. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` to `.env.local` and to the Vercel project. Never add a service-role or secret key to Vite.

## Migration and cache behavior

`prep-command-center-v1` remains the local state cache. `prep-command-center-v1-sync` stores only cache ownership, revision, dirty status, and last-sync metadata.

After sign-in, the app fetches the user's single `prep_state` row. An existing cloud row always wins unless the cache is explicitly marked dirty. If no row exists, valid legacy data from `prep-command-center-v1` seeds the row exactly once through the idempotent `initialize_prep_state` function. A cache tagged to a different account is never used to seed another account.

## Conflicts and recovery

Every cloud save calls `save_prep_state(data, expected_revision)`. Its `UPDATE ... WHERE revision = expected_revision` and revision increment occur in one database statement. A stale client receives `conflict` plus the newer state; its local dirty state remains cached, automatic writes stop, and the UI offers an explicit “Use cloud revision” action.

Realtime updates apply only when the local state is clean. They become the same protected conflict when local changes are pending, and cloud-applied state does not trigger a save loop.

The `prep_state_archive_before_update` trigger saves the previous JSONB and revision before every successful update and keeps the newest 100 rows per user. Importing a JSON backup and restoring history both use revision-checked updates, so the previous cloud state is archived and the restore receives a new revision.
