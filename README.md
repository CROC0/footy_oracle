# Footy Oracle

**Predict. Compare. Win.**

AFL game predictions, ladder standings, and team stats for the 2026 season — powered by the [Squiggle](https://squiggle.com.au) community model API and a custom win-probability model.

## Features

- **Upcoming games** — round-by-round view with win probability predictions
- **Custom prediction model** — combines recent form, ladder position, home advantage, and head-to-head history
- **Community tips** — Squiggle model consensus (how many models tip each team, average confidence)
- **Results** — completed games with scores, browseable by season (2023–2026)
- **AFL Ladder** — actual standings computed from game results, plus Squiggle's probabilistic predicted final standings
- **Teams** — overview grid and individual team pages with season stats and H2H records
- **Favourite team** — pick your team; it's highlighted across all pages and persists between sessions

## Tech Stack

- [Next.js 16](https://nextjs.org) — App Router, Server Components, Turbopack
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS v4](https://tailwindcss.com)
- [Squiggle API](https://api.squiggle.com.au) — free, no auth required

No database. All data is fetched server-side from the Squiggle API with Next.js `fetch` caching.

## Prediction Model

Win probability for each upcoming game is calculated from four weighted factors:

| Factor | Weight |
|---|---|
| Recent form (last 5 games W%) | 35% |
| Current ladder position | 30% |
| Home / away advantage | 25% |
| Head-to-head record (2023–2025) | 10% |

Each factor produces a normalised home/away score; the weighted sum is re-normalised to give a final probability (e.g. 68% home, 32% away).

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

No environment variables required — the Squiggle API is public.

## Caching

| Data | Revalidate |
|---|---|
| Current season games & ladder | 5 min |
| Tips | 1 hr |
| Historical games (past seasons) | 24 hr |
| Teams | 24 hr |

## Deployment

Deploy to [Vercel](https://vercel.com) with zero config:

```bash
vercel
```

Or connect the GitHub repo in the Vercel dashboard for automatic deploys on push.

## Data Attribution

Data courtesy of [Squiggle (squiggle.com.au)](https://squiggle.com.au).
