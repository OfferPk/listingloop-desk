# ListingLoop Desk

WhatsApp-first real-estate inquiry-to-visit desk for small agencies and brokers.

Capture inquiries, match them to listings, assign owners, move a Kanban pipeline, schedule visits, and open a prefilled `wa.me` chat. **Messages are never sent by the app** — you review and send in WhatsApp.

## Stack

- Next.js 15.5.25 + TypeScript + Tailwind
- better-sqlite3 (local SQLite)
- bcryptjs sessions (httpOnly cookie)
- papaparse CSV import/export
- vitest

## Scope (MVP)

- Auth + workspace (owner / manager / agent)
- Listings CRUD (archived not selectable for new inquiries)
- Inquiries CRUD + phone normalize (`03…` → `92…`)
- Kanban stages with move buttons
- Today / overdue queues + visits
- Notes + WhatsApp handoff templates
- CSV import (map → preview → commit, phone dedupe) + CSV export (formula-safe)
- Seed demo data

**Out of scope:** Meta/WABA APIs, scraping, Docker/Postgres, AI, billing.

## Install / run

```bash
npm install
cp .env.example .env.local   # optional
npm run seed
npm run dev
```

Open http://localhost:3000

```bash
npm test
npm run build
```

## Demo logins

| Role    | Email                     | Password    |
|---------|---------------------------|-------------|
| Owner   | owner@listingloop.local   | owner12345  |
| Manager | manager@listingloop.local | manager12345 |
| Agent   | agent@listingloop.local   | agent12345  |

## Auth notes

- Password minimum: **10** characters (register + invite).
- Soft in-memory rate limit on **login** and **register**: ≤10 failures per IP/email in 15 minutes → HTTP **429** with `Retry-After`. Single-node only (not shared across replicas).
- Team roster + CSV import are **manager/owner only** (API 403 + page redirect for agents).

## Docs

- [Product notes](docs/PRODUCT.md)
- [Roman Urdu guide](GUIDE-roman-urdu.md) — install, features, troubleshooting
- [STATUS](STATUS.md)

## License

Private factory MVP — not published.
