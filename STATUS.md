# ListingLoop Desk — STATUS

**Version:** 0.1.1  
**Updated:** 2026-09-28T16:30:00+05:00 (Asia/Karachi)  
**Status:** READY_TO_PUBLISH

## Dual-clear (v0.1.1)

| Gate | Result |
|------|--------|
| QA R2 | **PASS** (`QA-REPORT-R2.md`) |
| Security R2 | **PASS_WITH_NOTES** (`SECURITY-REPORT-R2.md`) |
| `npm test` | **31/31** (8 files) |
| `npm run build` | **success** (Next.js 15.5.25) |
| Git push / tag | **blocked** — `GH_TOKEN` invalid; local release commit only |

## Verification

| Command | Result |
|--------|--------|
| `npm run seed` | OK — demo workspace + 6 listings + 12 inquiries |
| `npm test` | **31 passed** (8 files) |
| `npm run build` | **success** (Next.js 15.5.25) |

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@listingloop.local | owner12345 |
| Manager | manager@listingloop.local | manager12345 |
| Agent | agent@listingloop.local | agent12345 |

## v0.1.1 ship-blocker fixes

- [x] Team roster API + page manager-only (agents 403 / redirect)
- [x] Import pipeline API + pages manager-only; Import nav hidden for agents
- [x] Password min 10; login/register soft rate limit → 429
- [x] `csvEscape` leading whitespace/control + formula chars
- [x] Visit outcome UI + PATCH route (agent own / manager any)
- [x] Dual-clear QA R2 + Security R2; CHANGELOG cut; READY_TO_PUBLISH

## MVP delivered

- [x] Auth + workspace (owner / manager / agent), httpOnly session
- [x] Listings CRUD (archived excluded from new-inquiry pickers)
- [x] Inquiries CRUD + phone normalize (`03…` → `92…`) + wa.me
- [x] Kanban board with stage move buttons + filters
- [x] Today/overdue queues + visits (+ outcome controls)
- [x] Notes presets + activity events
- [x] WhatsApp handoff templates (human send — never claims sent)
- [x] CSV import (manager-only map → preview → commit)
- [x] CSV export formula-safe (owner/manager)
- [x] Seed, vitest, README, GUIDE-roman-urdu.md, docs/PRODUCT.md

## Intentional MVP gaps

- No drag-and-drop kanban (buttons only)
- Activity timeline is event-type list (not rich metadata UI)
- Team invite is a simple form (seed covers demo users)
- No Meta/WABA, scraping, Docker/Postgres, AI
- Rate limit is in-memory (single node only)

## Key paths

- App: `/workspace/factory/projects/listingloop-desk`
- DB: `data/listingloop.db`
- Guide: `GUIDE-roman-urdu.md`
