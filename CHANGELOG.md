# Changelog

## [Unreleased]

### Added
- **Board hide won/lost by default:** default `/board` columns are active only (`new | contacted | visit_scheduled | negotiation`). `?closed=1` or `?show=all` reveals Won + Lost; **Show closed / Hide closed** toggle (EN + Roman Urdu hint). Explicit `stage=won|lost` still reveals that column. OnboardingChecklist unchanged when open/listings zero.
- **Lost-reason preset chips:** replaces `window.prompt` on board move + inquiry detail. Presets: Budget, Location/mismatch, Timing, Went silent, Other (+ free text, max **120**). Skip → `null` reason. Constants: `LOST_REASON_PRESETS`, `MAX_LOST_REASON_LENGTH` in `types.ts`.
- **Inquiry export stage + date window:** `GET /api/export/inquiries.csv` accepts optional `stage` (single or comma list) and `from`/`to` (**inclusive on `created_at`**, YYYY-MM-DD). `/export` page with presets All / Open active / Won / Lost + date from/to (managers/owners; agents 403/redirect). `csvEscape` formula-safe unchanged. `listInquiries` extended for comma stages + date window.

## [0.1.2] — 2026-09-28

### Added
- **First-run onboarding checklist** on Dashboard, Board, and Imports (managers): dismissible 3-step guide (Add listing → New inquiry / Import CSV → Invite agent) when open inquiries or listings are zero. Dismiss persisted in `localStorage` keyed by user id. EN primary + Roman Urdu subtitle.
- **`POST /api/inquiries/sample`** (manager/owner): seeds one sample listing + inquiry with `next_follow_up` today; “Seed sample inquiry” CTA on empty checklist.
- **Board locality filter:** text input `name="locality"` (city / locality) wired to existing `InquiryFilters.locality`; Clear link resets all query params.
- **Imports empty CTA:** primary Upload CSV + hint that portal/Meta CSV lands here.
- **Import cadence banner** (manager/owner only, constant N=3 days): soft “Re-upload portal CSV → Import” on Dashboard + Imports when newest successful commit is older than 3 days, or only failed jobs exist. Agents never see it.

## [0.1.1] — 2026-09-28

### Security
- `GET /api/users` now requires manager/owner (`requireManager`); agents receive **403**.
- `/team` is server-guarded; agents are redirected to `/dashboard`.
- All `/api/imports*` routes and `(desk)/imports/**` pages require manager/owner; Import nav link hidden for agents.
- Password minimum raised to **10** on register + invite (API + UI `minLength`).
- Soft in-memory rate limit on login (+ register): ≤10 failures / 15 min → **429** (single-node; documented in README).
- `csvEscape` neutralizes leading whitespace/control before formula chars `=+-@` (ClinicDesk parity).
- Demo seed passwords updated to meet min 10 (`owner12345`, `manager12345`, `agent12345`).

### Added
- Visit outcome controls on inquiry detail: status buttons (`scheduled|completed|no_show|cancelled`) + optional outcome note via `PATCH /api/inquiries/[id]/visits/[visitId]`. Completing can preset note “Visit done”.
- Authz: agent may update visits only on own inquiries; manager/owner any in workspace.

## [0.1.0] — 2026-09-21

Initial MVP ship (auth, listings, inquiries, board, today queues, CSV import/export, seed).
