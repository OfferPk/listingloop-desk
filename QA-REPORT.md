# ListingLoop Desk — Independent QA Report

**Status: FAIL** (release gate blocked by role/access-control defect)  
**Checked:** 2026-09-21 18:33 PKT  
**Project:** `/workspace/factory/projects/listingloop-desk`

## Automated verification

| Check | Result |
|---|---|
| `npm test` | **PASS** — 5 files, 23 tests passed |
| `npm run build` | **PASS** — Next.js 15.5.25 production build completed |

## Manual/API spot checks

- **Authentication:** **PASS** — unauthenticated API calls return 401; owner, manager, and agent demo logins authenticate with the correct role and workspace.
- **Role-scoped inquiries:** **PASS** — owner/manager can see the workspace inquiries; agent is scoped to assigned inquiries. Cross-owner inquiry access is denied.
- **Listings:** **PASS** — listings load, detail loads, archived listings are visible in the catalog, and an archived listing is rejected for a new inquiry (`400`).
- **Kanban:** **PASS** — stage move persisted (`new` → `contacted`) and was restored to the original seeded stage.
- **WhatsApp:** **PASS** — five templates returned; handoff returns a `https://wa.me/...` URL and clearly states the user must review/send; the app does not claim to send messages.
- **CSV export:** **PASS** — owner/manager export succeeds with the expected header; agent export is forbidden (`403`); formula-like data is prefixed safely (e.g. `'=CMD...`).
- **CSV import:** **PASS** — upload → column mapping → preview worked; preview correctly reported 1 create, 1 phone duplicate, 0 invalid. Import was not committed.
- **Guide:** **PASS** — `GUIDE-roman-urdu.md` covers install/run, demo logins, dashboard, Kanban, inquiries, listings, CSV, WhatsApp handoff, troubleshooting, and security notes.
- **Pages:** **PASS** — authenticated dashboard, board, listings, new inquiry, and imports pages load; `/today` intentionally redirects to `/dashboard`.

## Failure

### Agent can access Team page and roster API

The guide/UX says Team is for owners/managers, but an authenticated agent can:

- `GET /team` → `200`, rendering the Team page including the Invite user form.
- `GET /api/users` → `200`, returning all three workspace members, including names, emails, roles, and membership status.

The agent’s `POST /api/users` is correctly rejected (`403`), but the page and roster read access are still exposed. This is an authorization/privacy defect. The Team page and roster endpoint should require manager/owner access (preferably `requireManager()`), with the agent redirected/forbidden server-side.

## QA notes

- No application code was modified.
- Runtime SQLite data already contained pre-existing `QA-*` records (7 listings / 15 inquiries rather than the README seed’s 6 / 12); no reset was performed. Core seeded stages were restored after the Kanban check.
- One CSV import job remains in `previewed` state because the commit step was intentionally not run.
- A transient `/team` `500` was seen on the Next dev server while `.next` artifacts were being invalidated by concurrent local processes (`routes-manifest.json`/chunk errors). The clean production server on port 3002 served `/team` successfully, so this was treated as a local dev/build concurrency artifact, not the product failure above.
