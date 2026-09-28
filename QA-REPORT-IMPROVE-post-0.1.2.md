# ListingLoop Desk — QA Report (Unreleased post v0.1.2)

**Date:** 2026-09-28 17:54 PKT (Asia/Karachi)  
**Result: PASS**  
**Scope:** Unreleased pack atop shipped v0.1.2 — commit **`867b688`** (`feat: Unreleased pack — board hide closed, lost chips, export filters`). Does **not** re-test v0.1.2 absorbed features (onboarding/sample, locality, imports cadence).  
**Prior:** `QA-REPORT-R2.md` (PASS v0.1.1), `QA-REPORT-IMPROVE-20260928.md` (PASS improve → v0.1.2). Brief: `/workspace/factory/inbox/IMPROVE-listingloop-desk-20260928-1745.md`.  
**Constraint:** Report only — no product source changes, no GitHub push, no agent messages.  
**HEAD verified:** `867b6885139d31fedc3e64ee3ef731d116b892e1` (product tree clean for QA; version stays **0.1.2** Unreleased per STATUS).

## Executive summary

SE3 READY_FOR_QA claim holds. All three Master verify items live-checked against `COOKIE_SECURE=false PORT=3013 npm start` from an isolated build+DB under `/tmp/listingloop-qa-post012` (avoids concurrent `.next` races on the shared box). Automated suite **54/54** (13 files); production build green (Next.js 15.5.25). Agent correctly blocked from export page + CSV API. No new P0/P1. **CLEAR for improve merge/publish from QA.**

## Gates

| Gate | Result | Evidence |
|------|--------|----------|
| `npm test` | **PASS** | 13 files, **54/54** (incl. `board-filter` 5, `lost-reason` 4, `export-filter` 5) @ product tree `/workspace/factory/projects/listingloop-desk` |
| `npm run build` | **PASS** | Next.js 15.5.25 — compiled successfully in 6.6s; routes incl. `/board`, `/export`, `/api/export/inquiries.csv`; isolated copy `/tmp/listingloop-qa-post012` |
| Seed / demo logins | **PASS** | `npm run db:reset` → 6 listings / 12 inquiries; owner / manager / agent → `/api/auth/login` **200** (`COOKIE_SECURE=false`) |
| HEAD | `867b688` on `2a00a69` | Unreleased pack; no version bump (stay 0.1.2 Unreleased per STATUS) |

## Scoped verify (Master)

### 1) Board hide won/lost default + `?closed=1` — **PASS**

| Check | Result | Evidence |
|-------|--------|----------|
| Default columns | **PASS** | Manager `GET /board` **200**: RSC `visibleStages` = `["new","contacted","visit_scheduled","negotiation"]` (no won/lost). Copy: “Active only… Closed hide hain”. CTA **Show closed** → `/board?closed=1` |
| `?closed=1` | **PASS** | `GET /board?closed=1` **200**: stages include `won`+`lost`; copy “Showing all columns including Won + Lost.”; **Hide closed** → `/board`; form keeps `name="closed" value="1"` |
| `?show=all` | **PASS** | Same reveal path as closed=1 (`parseBoardShowClosed`); Hide closed present |
| Explicit `stage=won` | **PASS** | `GET /board?stage=won` **200**: visibleStages = active + `won` (closed still hidden overall) |
| Unit | **PASS** | `tests/board-filter.test.ts` 5/5 — ACTIVE_BOARD_STAGES, parse closed/show, explicit won/lost |
| Lib | **PASS** | `src/lib/board-filter.ts` + board page toggle preserves q/locality/listing/owner/source/stage |

Won/Lost still appear once in the stage **filter `<select>`** on default board (intentional — filter options list all `STAGES`). Kanban columns follow `visibleStages` only.

### 2) Lost-reason preset chips (board + detail) — **PASS**

| Check | Result | Evidence |
|-------|--------|----------|
| Presets | **PASS** | Budget / Location/mismatch / Timing / Went silent / Other; `MAX_LOST_REASON_LENGTH=120` (`types.ts` + unit) |
| Board + detail bundles | **PASS** | Built chunks `board/page-*.js` and `inquiries/[id]/page-*.js` both contain “Lost reason”, “Confirm lost”, “Went silent”, “Location/mismatch”, “Other reason”, `lost-reason-title` |
| Wiring | **PASS** | `KanbanBoard.tsx` + `InquiryActions.tsx` import `LostReasonPicker` (no `prompt` for lost; visit date still uses `prompt` — out of scope) |
| Live PATCH Budget | **PASS** | Manager `PATCH /api/inquiries/:id` `{stage:"lost",lost_reason:"Budget"}` → **200**, `lost_reason=Budget` |
| Skip → null | **PASS** | `{stage:"lost",lost_reason:null}` → **200**, reason `null` |
| Clamp | **PASS** | 160-char reason → stored length **120** |
| Unit | **PASS** | `tests/lost-reason.test.ts` 4/4 |

### 3) Export stage + from/to + presets (managers) — **PASS**

| Check | Result | Evidence |
|-------|--------|----------|
| Export UI | **PASS** | Manager `GET /export` **200**: Stage preset (All / Open active / Won / Lost), From/To date inputs (`export-from` / `export-to`), Download inquiries.csv |
| Agent page gate | **PASS** | Agent `GET /export` **307** → `/dashboard`; agent board nav has **no** `/export` (mgr board has `/export`) |
| CSV all | **PASS** | Manager `GET /api/export/inquiries.csv` **200** — 12 rows, stages include won+lost; `lost_reason` column present |
| Stage won | **PASS** | `?stage=won` → 1 row (Nadia Khan) |
| Stage open (comma) | **PASS** | `?stage=new,contacted,visit_scheduled,negotiation` → 10 rows; no won/lost |
| Date window | **PASS** | `?from=2020-01-01&to=2020-01-02` → **0** data rows; `?from=2026-09-23&to=2026-09-23` → 12 (seed all that day). Unit suite covers varied `created_at` windows |
| Combined | **PASS** | `?stage=lost&from=2020-01-01&to=2026-12-31` → 1 lost row |
| Validation | **PASS** | Bad `from=01-09-2026` → **400** `from must be YYYY-MM-DD`; `stage=nope` → **400** `Invalid stage filter` |
| Agent API | **PASS** | Agent `GET /api/export/inquiries.csv` **403** `Owners/managers only` |
| Owner | **PASS** | Owner `?stage=won` **200**, 1 row |
| Unit | **PASS** | `tests/export-filter.test.ts` 5/5 — stage single/comma, from/to, combine |

Export chunk embeds `OPEN_STAGES` array + preset select labels; href built client-side via `URLSearchParams`.

## P0 / new P1

**None.**

## Residuals / non-blockers

1. Visit schedule still uses `window.prompt` (board + detail) — intentional; only lost capture moved to chips.
2. Seed demo inquiries share one `created_at` calendar day (`2026-09-23`); live date-window empty/include checks OK; multi-day filtering covered by unit tests.
3. Soft rate limit / in-memory authz gaps remain intentional MVP (STATUS); out of this pack’s scope.
4. Live verify used isolated `/tmp/listingloop-qa-post012` build+DB; product tree not modified by QA. Untracked `SECURITY-REPORT-IMPROVE-1751.md` left by another agent — not part of this QA run.
5. Did not re-test onboarding checklist, locality filter, or import cadence (v0.1.2 absorbed; prior PASS).

## Gate

- Master items 1–3: **HOLD**
- New P0/P1: **none**
- **CLEAR from QA:** **YES**
