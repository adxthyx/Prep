# Handoff — Prep Supabase persistence

## Current goal

Migrate Prep from browser-only localStorage persistence to authenticated Supabase Postgres while retaining `prep-command-center-v1` as an offline cache and preserving `/prep` deployment routing.

## Just completed (2026-08-16)

- Added Supabase email/password auth and local-session sign-out.
- Added a browser client using `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; `.env.local` is present and ignored.
- Replaced the store's direct localStorage effect with a dedicated cache/cloud sync layer.
- Added 750 ms cloud-save debounce, immediate cache writes, retries, visibility/pagehide flushes, and persisted dirty metadata.
- Added atomic revision-checked RPC saves, explicit conflict handling, safe cloud-state acceptance, and guarded Realtime updates.
- Added explicit backup-restore confirmation; imports use revision-checked saves and preserve the current cloud state in history.
- Added Settings sync/revision/timestamp status plus recent server history and restore actions.
- Added `supabase/schema.sql`: JSONB state/history tables, authenticated RLS, auth-derived RPCs, automatic bounded history (100), and Realtime publication setup.
- Added `.env.example`, `SUPABASE_SETUP.md`, README updates, and `@supabase/supabase-js@2.112.3`.

## Current state

- `npm run build`: passes (Vite chunk-size warning only).
- `/prep/`, direct `/prep/settings`, JS/CSS, and fonts returned HTTP 200 from production preview.
- Vite base remains `/prep/`; React Router basename remains `/prep`; Vercel rewrites are unchanged.
- `git diff --check` and static `/prep`/RLS/RPC/security assertions pass.
- `npm run lint`: unavailable because the repository has no lint script.
- No test script/tests exist; `npm test --if-present` skipped.
- Production `npm audit` reports two moderate React Router advisories in the existing `react-router-dom` dependency; no unrelated major-version upgrade was applied.
- In-app browser was unavailable, so no visual click-through was possible.
- No commit or push was made.

## Active files

- `src/store.jsx`
- `src/auth.jsx`
- `src/lib/supabase.js`
- `src/lib/prepPersistence.js`
- `src/components/Layout.jsx`
- `src/pages/Settings.jsx`
- `src/main.jsx`
- `supabase/schema.sql`
- `SUPABASE_SETUP.md`
- `.env.example`, `.gitignore`, `README.md`
- `package.json`, `package-lock.json`

## Known failures / dead ends

- SQL was not applied remotely; no connected Supabase database tooling is configured in the repository.
- Runtime auth/sync/history flows cannot work until `supabase/schema.sql` is run.
- Build output is ~1.06 MB minified and retains Vite's existing large-chunk warning.
- `npm audit --omit=dev` is not clean because of the existing React Router advisories.

## Concrete next steps

1. User reviews the diff.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Configure Auth Site URL/redirects from `SUPABASE_SETUP.md` and add the two Vite variables in Vercel.
4. Test sign-up/sign-in, first legacy migration, two-device conflict, offline retry, import restore, and history restore against the configured project.
5. Commit/deploy only after user approval.
