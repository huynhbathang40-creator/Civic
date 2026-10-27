# Ballot Ready (Civic)

A mobile-first web app where a US voter enters their address once and gets everything for the next election:
where to vote, a personal sample ballot, plain-language ballot measure explanations, reminders, their districts
and officials, and county-level polling access insights.

See [`docs/Voter_App_PRD.pdf`](docs/Voter_App_PRD.pdf) for the product requirements and
[`docs/Google_Civic_Information_API.pdf`](docs/Google_Civic_Information_API.pdf) for the API background.

## Features (v1.0)

| # | Feature | Route | Data |
|---|---|---|---|
| F1 | Where do I vote: polling places, early voting, drop boxes on a map with directions | `/vote` | `/api/voterinfo`, OpenStreetMap |
| F2 | Personal sample ballot: mark picks (saved in localStorage), print or save as PDF | `/ballot` | `/api/voterinfo` |
| F3 | Ballot measure explainer: neutral AI summary in English, Spanish or Vietnamese, official text alongside | `/measures` | `/api/explain` |
| F4 | Reminders: `.ics` calendar download and in-browser notifications | `/reminders` | `/api/elections` |
| F5 | Districts & officials | `/districts` | `/api/districts`, `/api/officials` |
| F6 | Polling access insights by county, precomputed at build time | `/insights` | `public/data/insights.json` |

## Architecture

- **Frontend:** React + Vite single-page app in `src/`, deployed to Netlify's CDN.
- **API proxy:** Netlify Functions in `netlify/functions/`. All API keys stay on the server.
  Addresses are sent in POST bodies (never in URLs) and are never logged or stored.
- **No database:** the address, ballot picks and preferences live in the browser's localStorage
  ("Clear my data" in the footer removes them). The functions use short in-memory caches.
- **Build-time data:** `scripts/build-data.mjs` runs before `vite build`. It writes the current
  members of Congress to `netlify/data/legislators.json` and the F6 county stats to
  `public/data/insights.json`. If an upstream fails, the committed file is kept.

## Environment variables (Netlify → Project configuration → Environment variables)

| Variable | Required | Scopes | Purpose |
|---|---|---|---|
| `GOOGLE_CIVIC_API_KEY` | yes | Builds, Functions | Google Civic Information API |
| `OPENSTATES_API_KEY` | optional | Functions | State legislators in F5 (free key at openstates.org) |
| `EXPLAIN_MODEL` | optional | Functions | Pin the Claude model used for F3 |

F3 uses **Netlify AI Gateway**, which injects Anthropic credentials automatically once the project
has had one production deploy. No key is needed; to use your own instead, set `ANTHROPIC_API_KEY`.

Never commit keys to this repo.

## Deploying

1. In Netlify, import this GitHub repo (branch `main`). Build settings come from `netlify.toml`
   (`npm run build`, publish `dist`).
2. Set the environment variables above.
3. Optional: add a build hook and trigger it on a schedule (e.g. daily during election season) to refresh
   the legislators list and insights data.

## Local development

```sh
npm install
GOOGLE_CIVIC_API_KEY=... npm run dev   # Vite + Netlify Functions emulation on http://localhost:5173
```

Tick "Use Google's test election" on the address form to use election `2000`, which always has data.
