# Handoff — Prep Command Center

## Goal
Local single-user web app running the entire Jul→Nov 2026 job-switch prep (SDE1 + AI/FDE track). Built and fully seeded 2026-07-11. **Status: complete and verified.**

## What was just completed (2026-07-11)
Entire app built from scratch in one session:
- React 18 + Vite 5 + Tailwind 3, hash routing, localStorage persistence (`prep-command-center-v1`), Export/Import JSON
- Theme: Reddit-orange (#FF4500) mirrored from `~/Desktop/ABC/PORTFOLIO` (globals.css tokens + Reddit Sans/Mono woff2 copied to `public/fonts/`)
- Dashboard: launch-rail timeline (signature element), countdowns (Aug 1 apps open / Oct 31 season end from `src/data/config.json`), streak, activity heatmap, Today queue (in-progress + due revisits), per-module progress
- Spaced repetition: revisit status → resurfaces at 3/7/21d intervals, "reviewed ✓" bumps stage
- 6 modules: Morning TIL (kanban DnD + milestones + arch notes + decision log + demo checklist), SDE1 roadmap (+ applications table), AI/FDE roadmap (+ project stories, 1 prefilled + 3 blank), DSA, HLD, LLD (+ timed-mock log)
- DSA data fetched real at build time: Striver A2Z (434) + SDE (183) + NC150, deduped to **559 master problems**; company top-50 lists for 10 companies (edit list in `dsa-companies.json`); 30 claude-picks
- All resource URLs batch-verified via curl; 3 dead links removed; `verified:false` flags on unverifiable entries

## Verification done
Playwright drive (script in scratchpad, gone after session): status cycling, kanban drag persists reload, export→clear→import restores exactly, garbage import rejected, revisit scheduling correct, company view syncs status with master. `vite build` clean.

## Active files
Everything under `/Users/adithya/Desktop/ABC/Prepppppp`. Seeds: `src/data/*.json`. State logic: `src/store.jsx`, item registry: `src/lib/registry.js`.

## Known limitations / dead ends
- LeetCode URLs return 403 to curl (bot-blocked) — they're correct, just not machine-verifiable
- takeuforward.org has no public API (probed several endpoints) — A2Z/SDE data came from GitHub mirror repos instead
- Portfolio Vercel URL is behind SSO — theme extracted from local source instead
- NeetCode 250 not seeded (no clean flag in source data; only 150 + Blind75 flags exist)
- Company lists: Razorpay only has 12 problems in source repo (all-time window), Zomato 27, Swiggy 40 — that's all the data that exists

## Next steps (user's, not build)
1. `npm run dev`, start using; adjust seed JSONs to taste
2. Optionally: `git commit` exported backups for progress history
3. Possible future features: pomodoro, DSA virtualized list if it ever feels slow, confetti tuning
