# Handoff - Prep schedule

## Current goal

Keep the entire Prep Command Center aligned to the new study, fitness and job-search schedule.

## Just completed (2026-08-28)

- Set the shared plan to finish study on Jan 7, 2027.
- Added the target of two hikes by Dec 31, 2026.
- Set the job-search window to Jan 8–Feb 28, 2027.
- Updated dashboard countdowns, mission rail, sidebar phase, pacing fallback, Settings, SDE application copy and README.
- Added schedule version migration so old saved Aug–Oct defaults are replaced while custom legacy dates are preserved where possible.

## Current state

- `npm run build` passes.
- `git diff --check` passes.
- JSON validation passes for the edited seed files.
- Only the existing Vite large-chunk warning remains.
- The date source of truth is `src/data/config.json`.
- Schedule migration is committed and pushed as `082b7ed` on `origin/main`.

## Active files

- `src/data/config.json`
- `src/lib/pacing.js`
- `src/components/Layout.jsx`
- `src/pages/Dashboard.jsx`
- `src/pages/Settings.jsx`
- `src/pages/SdeRoadmap.jsx`
- `src/data/sde-roadmap.json`
- `README.md`
- `src/store.jsx`

## Known failures / dead ends

- The two-hike target is represented in the schedule UI; no separate hike-completion tracker was added.
- This repository remains the React tracker; the native Android Anchor app and FastAPI gateway are still only represented by the project plan.

## Concrete next steps

1. Run `npm run dev` and visually verify the new timeline and countdowns.
2. If desired, add a dedicated hike progress counter or checklist.
