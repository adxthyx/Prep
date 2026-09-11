# Handoff — SDE curriculum

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
- Schedule remains unchanged: study ends Jan 7, 2027; two hikes by Dec 31, 2026; job search Jan 8–Feb 28, 2027.

## Active files
- src/data/{sde-roadmap,hld,lld,dsa-patterns}.json
- src/pages/{SdeRoadmap,Hld,Lld,Dsa}.jsx
- src/components/Layout.jsx, src/lib/registry.js, src/main.jsx, src/store.jsx
- README.md

## Known limitations / next steps
- Verify expanded sections and legacy URL redirect in the browser before deployment.
- No additional courses or sheets were added. Role-dependent material remains optional.
