# Handoff - Anchor project tracker

## Current goal

Replace the old Morning TIL/LangGraph project tracker with the Anchor MVP implementation plan from `Personal_OS_MVP_Technical_Architecture.pdf`.

## Just completed (2026-08-24)

- Replaced TIL seed data with 49 Anchor cards across P0 Foundation through P9 Hardening.
- Added 10 milestones, 10 MVP readiness checks, 10 architecture decisions, 16 source resources, and a full local-first architecture note.
- Renamed the visible tracker to Anchor.
- Updated the tracker metadata, decision log, source label and architecture display to use Anchor.
- Added dev-only local mode: `npm run dev` uses a synthetic local user and local cache without Supabase auth, cloud sync, Realtime or server history.
- Added a one-time state migration that clears stale old TIL cards, notes and decisions while preserving unrelated Prep progress.

## Current state

- `npm run build` passes; only the existing Vite large-chunk warning remains.
- `git diff --check` passes.
- Production builds still require Supabase authentication; `VITE_LOCAL_MODE=true` can be used only for an intentional local preview build.
- The rest of the Prep roadmaps and app behavior were left unchanged.

## Active files

- `src/data/project-til.json`
- `src/pages/ProjectTIL.jsx`
- `src/lib/registry.js`
- `src/components/Layout.jsx`
- `src/store.jsx`
- `src/auth.jsx`
- `.env.example`

## Known failures / dead ends

- This repository is still the existing React web tracker; the PDF's native Android app is represented as the execution plan only.
- No Android project or FastAPI gateway was created in this scoped tracker update.

## Concrete next steps

1. Run `npm run dev` to test the tracker without an account.
2. Decide whether the separate Anchor Android repository should use the `com.anchor` package namespace.
2. Move cards across the tracker as implementation progresses.
3. Revisit the PDF's platform/API links before implementing integrations.
