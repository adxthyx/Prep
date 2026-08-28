# Prep Command Center 🚀

Local, single-user mission control for the Aug 2026 → Feb 2027 study-to-job-search plan: Anchor project tracking, SDE1 + AI/FDE roadmaps, DSA (Striver A2Z + SDE sheet + NeetCode 150 deduped), HLD, LLD — with study complete by Jan 7, two hikes by Dec 31, and one-click backup.

No auth, no cloud, no API keys. Everything runs and stays on this machine.

## Run

```bash
npm install
npm run dev
```

Open the URL Vite prints (default `http://localhost:5173`). That's it.

## Where the data lives

**Seed content** (the curriculum — edit freely, it's yours):

| File | Contents |
|---|---|
| `src/data/dsa-problems.json` | 559 deduped problems (Striver A2Z 434 + SDE 183 + NeetCode 150 + Blind 75 flags + 30 Claude picks), with topic/pattern/difficulty/orders/companies |
| `src/data/dsa-companies.json` | Top-50-by-frequency LeetCode lists for 10 companies |
| `src/data/project-til.json` | Anchor kanban cards, milestones P0–P9, demo checklist, architecture notes, decision log, resources |
| `src/data/sde-roadmap.json` | CS core / SQL / resume / behavioral / applications phases |
| `src/data/ai-roadmap.json` | AI-FDE track: foundations → RAG → agents → evals → serving → FDE craft → storytelling → design prompts |
| `src/data/hld.json` | 25 concepts + 8 classic questions + resources |
| `src/data/lld.json` | SOLID + patterns, 15 machine-coding problems with reference solutions, mock-log config |
| `src/data/config.json` | Study, hike and job-search dates + spaced-repetition intervals |

**Your progress** (statuses, notes, links, kanban positions, applications, mocks, stories, activity/streak) is stored per user in Supabase Postgres. `localStorage` key `prep-command-center-v1` remains a fast/offline cache; cloud writes use optimistic revision checks and automatic server-side history. Seeds and progress remain separate, so seed files can be edited or reordered without losing progress as long as item `id`s stay stable. See [`SUPABASE_SETUP.md`](SUPABASE_SETUP.md) for setup and recovery behavior.

## Backup: Export / Import

- **Export** (sidebar) downloads `prep-backup-YYYY-MM-DD.json` — the complete progress state. Commit it to git if you want history.
- **Import** restores from any exported file. Invalid files are rejected without touching current state.

## Adding a company to the DSA list

Edit `src/data/dsa-companies.json` and append to `companies`:

```json
{
  "name": "Meta",
  "key": "meta",
  "window": "last 3 months",
  "problems": [
    { "slug": "two-sum", "title": "Two Sum", "difficulty": "Easy", "frequency": 92.1,
      "url": "https://leetcode.com/problems/two-sum/" }
  ]
}
```

Grab fresh CSVs from [snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions) (this repo's lists are the May 2026 snapshot). If a problem's `slug` matches one in the master list, its status syncs both ways automatically.

## Spaced repetition

Mark anything **revisit** (click its status pill — cycles todo → in progress → done → revisit). It resurfaces in the dashboard **Today** queue after **3 days**, then **7**, then **21**, then every 21 (edit intervals in `src/data/config.json`). Hitting **reviewed ✓** pushes it to the next interval; setting any other status clears the schedule. The 🎲 button in DSA jumps to a random revisit-marked problem.

## Data provenance

Fetched at build time (2026-07-11) from real sources — see `meta.sources` inside each JSON:

- Striver A2Z sheet — via [aditya-190/a2zdsa](https://github.com/aditya-190/a2zdsa) (456 questions, deduped to 434 unique)
- Striver SDE sheet — via [abhiiishek07/180DSA](https://github.com/abhiiishek07/180DSA) (191 → 183 unique)
- NeetCode 150 / Blind 75 — via [neetcode-gh/leetcode](https://github.com/neetcode-gh/leetcode)
- Company lists — via [snehasishroy/leetcode-companywise-interview-questions](https://github.com/snehasishroy/leetcode-companywise-interview-questions)
- LLD reference solutions — [ashishps1/awesome-low-level-design](https://github.com/ashishps1/awesome-low-level-design)

Every resource URL was checked with HTTP requests at build time. Anything marked `"verified": false` (shown as an amber *unverified* chip in the UI) couldn't be machine-verified — titles are correct, double-check the link. The ~18 `claude-picks` DSA problems added beyond the fetched lists carry `verified: false` on principle since their URLs were constructed from memory.

## Keyboard shortcuts

`g` then: `d` dashboard · `p` Morning TIL · `s` SDE1 · `a` AI/FDE · `q` DSA · `h` HLD · `l` LLD

## Stack

React 18 + Vite 5 + Tailwind 3, browser-history routing mounted at `/prep`, zero backend. Theme mirrors the Reddit-orange portfolio design system (Reddit Sans/Mono served locally from `public/fonts`). Dark mode default, light toggle in the sidebar.
