# ListingLoop Desk — STATUS

**Version:** 0.1.0  
**Updated:** 2026-09-21T18:28:05+05:00 (Asia/Karachi)  
**Status:** READY_FOR_QA

## Verification

| Command | Result |
|---------|--------|
| `npm run seed` | OK — demo workspace + 6 listings + 12 inquiries |
| `npm test` | **23 passed** (5 files) |
| `npm run build` | **success** (Next.js 15.5.25) |

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@listingloop.local | owner123 |
| Manager | manager@listingloop.local | manager123 |
| Agent | agent@listingloop.local | agent123 |

## MVP delivered

- [x] Auth + workspace (owner / manager / agent), httpOnly session
- [x] Listings CRUD (archived excluded from new-inquiry pickers)
- [x] Inquiries CRUD + phone normalize (`03…` → `92…`) + wa.me
- [x] Kanban board with stage move buttons + filters
- [x] Today/overdue queues + visits
- [x] Notes presets + activity events
- [x] WhatsApp handoff templates (human send — never claims sent)
- [x] CSV import (map → preview → commit, phone/external_ref dedupe)
- [x] CSV export formula-safe (owner/manager)
- [x] Seed, vitest, README, GUIDE-roman-urdu.md, docs/PRODUCT.md

## Intentional MVP gaps

- No drag-and-drop kanban (buttons only)
- Visit outcomes UI minimal (scheduled path required; status updates via API/data)
- Activity timeline is event-type list (not rich metadata UI)
- Team invite is a simple form (seed covers demo users)
- No Meta/WABA, scraping, Docker/Postgres, AI

## Key paths

- App: `/workspace/factory/projects/listingloop-desk`
- DB: `data/listingloop.db`
- Guide: `GUIDE-roman-urdu.md`
