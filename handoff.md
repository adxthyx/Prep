# Handoff — content update (update_plan.md) + password reset

## Latest (2026-10-02): content update + dashboard cleanup (pushed to main)
- update_plan.md applied to `src/data/` (ai-roadmap +5 items, ai-papers 25, hld 29+8, lld, sde-roadmap; dsa-companies refreshed to 12 Jul 2026 snapshot incl. PhonePe; DSA re-tiered T1 95 / T2 78 / T3 386). Plan §4 validation passes.
- config: tier1Target 2026-11-30; hikes and unused studyStart/jobSearch dates removed. Settings values still override config.
- Appendix B fixes: pacing fallback ignores Tier 3 DSA; Today's plan shuffle hashes the full id with the day seed (rotates daily); company view maps renamed slugs via `lcSlug`; LLD non-GitHub `referenceUrl` labelled "Problem statement".
- Dashboard: removed heading/date line, Mission timeline, countdown cards, footer dates, filler copy; streak + "revisits due today" badge kept. Settings: removed "Next season" and "Current target". Sidebar PHASE label and Applications job-search date removed. Hikes removed everywhere.
- Deleted `prep_resources.json`, `_to_delete/`. Verified with local-mode build + headless Chromium: all 8 routes load, no console errors.
- `src/auth.jsx` (forgot-password flow) still uncommitted on purpose; `update_plan.md` untracked.
- Not addressed: Appendix B #2 (dashboard countdown vs settings — moot now, countdowns removed), #6 (config seeds only new state). Sidebar footer hint still says "g+p til" (stale shortcut).

## Previous (2026-09-30): forgot-password flow (uncommitted)
- `src/auth.jsx`: sign-in form gains "Forgot password?" mode → `resetPasswordForEmail` with redirect `${origin}/prep/`. Recovery link → `PASSWORD_RECOVERY` event (plus URL-hash `type=recovery` fallback) → `SetPasswordForm` (new + confirm) → `updateUser({ password })`.
- Build passes. Not browser-tested: dev mode always uses LOCAL_MODE, so test via `npm run build && npx vite preview` or on deploy.
- Password cannot be read from Supabase (bcrypt hash only). Stopgap if locked out: SQL `update auth.users set encrypted_password = extensions.crypt('<pw>', extensions.gen_salt('bf')) where email = ...`.
- `.env.local` has an unused `VITE_SUPABASE_SECRET_KEY`. The user was advised to remove it and to rotate the key if it was ever deployed. Not in `dist`.

## Current goal
Expand the existing curriculum for SDE1/SDE2 using explicit practical subtopics; remove the scrapped Anchor page.

## Completed (2026-09-11)
- Removed Anchor page, seed data, navigation/shortcut, registry/search/progress entries and project-only store initialization/actions. Old `/project` URLs redirect to the dashboard.
- Preserved inert legacy project fields in imported/saved backups; existing study IDs and progress remain intact.
- Added dedicated language-depth (choose one branch), concurrency, security and testing/debugging/lifecycle sections; expanded database correctness/performance and SDE2 ownership.
- Added DSA pattern verification guidance without adding problems; expanded HLD failure semantics and LLD modeling. Retained eight HLD designs and 15 LLD problems, with an optional service-level reservation extension.
- Removed exhaustive SQL 50 coverage claim and updated roadmap labels/README.

## Current state / validation
- Production build passes; existing Vite large-chunk warning remains.
- Seed JSON validation, ID uniqueness/preservation checks and git diff --check pass.
- Store checks confirm clean new state and preservation of legacy backups/study progress.
- Browser visual QA has not been performed. Delivery branch: `codex/sde-curriculum-remove-anchor`. No deployment performed.
- Schedule: study ends Jan 7, 2027; job search Jan 8–Feb 28, 2027.

## Active files
- src/data/*.json (all content files touched by update_plan.md), update_plan.md
- src/pages/{SdeRoadmap,Hld,Lld,Dsa}.jsx
- src/components/Layout.jsx, src/lib/registry.js, src/main.jsx, src/store.jsx
- README.md

## Known limitations / next steps
- Verify expanded sections and legacy URL redirect in the browser before deployment.
- No additional courses or sheets were added. Role-dependent material remains optional.
