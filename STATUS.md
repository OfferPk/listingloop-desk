# ListingLoop Desk — STATUS

**Version:** 0.1.2  
**Updated:** 2026-09-28T17:52:00+05:00 (Asia/Karachi)  
**Status:** READY_FOR_QA  
**Prior release:** `v0.1.2` @ `2a00a69` (SHIPPED; QA PASS / Security PASS_WITH_NOTES)

## Current handoff (Unreleased on HEAD)

| Item | Notes |
|------|--------|
| Stack base | `2a00a69` — release ListingLoop Desk v0.1.2 (**do not amend**) |
| Pack | Board hide won/lost + `?closed=1`; lost-reason preset chips; export stage + `created_at` date window |
| Version | Stays **0.1.2** — CHANGELOG **[Unreleased]** only (no 0.1.3 bump) |
| Demo passwords | **Unchanged** — `owner12345` / `manager12345` / `agent12345` |
| Out of scope | DnD Kanban, soft-archive, Meta/WABA, billing, Docker/Postgres, dedicated `/inquiries` list |
| GitHub | **Do not push** — local Unreleased commit only |

## Verification (this pack)

| Command | Result |
|--------|--------|
| `npm test` | **54/54** (13 files) |
| `npm run build` | **success** (Next.js 15.5.25) |

## Acceptance (improve 1745)

- [x] Default board hides won/lost; `?closed=1` / Show closed reveals; `stage=won|lost` still works; checklist on empty
- [x] Lost chips (Budget / Location/mismatch / Timing / Went silent / Other≤120 / Skip→null) on board + detail
- [x] Export `stage` + `from`/`to` on `created_at`; UI presets; managers only; formula-safe CSV

## Dual-clear (v0.1.2 improve pack — prior)

| Gate | Result |
|------|--------|
| QA | **PASS** (`QA-REPORT-IMPROVE-20260928.md`) |
| Security | **PASS_WITH_NOTES** (`SECURITY-REPORT-IMPROVE-1715.md`) |
| `npm test` | **40/40** (10 files) at release |
| `npm run build` | **success** (Next.js 15.5.25) |
| Base commit | `4e54975` — onboarding, locality filter, import cadence, sample inquiry API |
| Release commit | `2a00a69` |

## Demo logins

| Role | Email | Password |
|------|-------|----------|
| Owner | owner@listingloop.local | owner12345 |
| Manager | manager@listingloop.local | manager12345 |
| Agent | agent@listingloop.local | agent12345 |

## Intentional MVP gaps

- No drag-and-drop kanban (buttons only)
- Activity timeline is event-type list (not rich metadata UI)
- Team invite is a simple form (seed covers demo users)
- No Meta/WABA, scraping, Docker/Postgres, AI
- Rate limit is in-memory (single node only)
- Import cadence days are constant (no settings UI)
- Soft-archive / dedicated inquiries list page not in this pack

## Key paths

- App: `/workspace/factory/projects/listingloop-desk`
- DB: `data/listingloop.db`
- Guide: `GUIDE-roman-urdu.md`
- Improve brief: `/workspace/factory/inbox/IMPROVE-listingloop-desk-20260928-1745.md`
