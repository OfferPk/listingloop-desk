# ListingLoop Desk — Independent QA Report R2 (v0.1.1)

**Status: PASS**  
**Checked:** 2026-09-28 16:28 PKT (Asia/Karachi)  
**Project:** `/workspace/factory/projects/listingloop-desk`  
**Version under test:** 0.1.1 (`STATUS.md` READY_FOR_QA)  
**Tester:** QA Bug Hunter (REPORT ONLY — no product code changes, no GitHub push, no agent messages)

## Automated verification

| Check | Result |
|---|---|
| `npm test` | **PASS** — 8 files, **31/31** tests passed |
| `npm run build` | **PASS** — Next.js 15.5.25 production build (isolated QA copy under `/tmp/listingloop-qa` to avoid concurrent `.next` races on the shared box; original tree had transient `pages-manifest` / truncated-JSON races from other agents) |
| `npm run db:reset` / seed | **OK** — 6 listings, 12 inquiries; demo passwords min-10 |

Live prod server: `COOKIE_SECURE=false PORT=3011 npm start` from the isolated build.

## Prior FAIL (2026-09-21) — Team roster ACL

| Check | Agent | Manager | Owner |
|---|---|---|---|
| `GET /api/users` | **403** `{"error":"Forbidden — owners/managers only"}` | **200** (full roster) | **200** |
| `GET /team` | **307** → `/dashboard` | **200** (Invite form present) | **200** |
| `POST /api/users` | **403** | **400** validation (not 403) | — |

**Verdict: CLOSED.** Prior ship blocker (agent could GET `/team` 200 and GET `/api/users` 200) is fixed.

## Claimed v0.1.1 fixes

### 1. Import pipeline manager-only + Nav hide

| Check | Result |
|---|---|
| Agent `GET /api/imports` | **403** |
| Agent `POST /api/imports` | **403** |
| Agent `POST /api/imports/:id/{mapping,preview,commit}` | **403** |
| Agent `GET /imports`, `/imports/new` | **307** → `/dashboard` |
| Manager `GET /api/imports`, `/imports` | **200** |
| Agent dashboard nav | No `/team` or `/imports` links (Dashboard/Board/Listings only) |
| Manager dashboard nav | Includes **Import** + **Team** |

### 2. Auth hygiene

| Check | Result |
|---|---|
| Register password length 5 / 9 | **400** `Password must be at least 10 characters` |
| Invite password length 9 | **400** same message |
| Register + Team invite UI | `minLength="10"` / label “min 10” |
| Login soft rate limit | Failures 1–10 → **401**; 11–12 → **429** `Too many failed login attempts. Try again in 900s.` |
| Register soft rate limit | After 10 counted failures (workspace-already-exists) → **429** `Too many registration attempts…` |

### 3. `csvEscape` leading whitespace/control + formula chars

Live manager CSV export after injecting `=CMD…`, `+…`, `\t=HYPERLINK…`, ` =SUM(A1)` rows:

- Cells exported as `'=CMD…`, `'+1234567890`, `'\t=HYPERLINK…`, `' =SUM(A1)` (leading `'` prefix).
- Agent `GET /api/export/inquiries.csv` → **403**.
- Unit suite `tests/csv-dedupe.test.ts` still **6/6** PASS.

### 4. Visit outcome UI + PATCH ACL

| Check | Result |
|---|---|
| Agent PATCH own inquiry visit → `completed` + “Visit done” | **200** |
| Agent PATCH manager’s visit | **403** `Forbidden` |
| Manager PATCH agent’s visit → `no_show` | **200** |
| Manager PATCH own visit → `cancelled` | **200** |
| Inquiry detail UI | Visit section + status controls (`Scheduled` / `Completed` / `Cancelled` / No-show via `VisitOutcomeControls`) |

## Smoke

| Area | Result |
|---|---|
| Auth | Unauth `/api/auth/me` & `/api/inquiries` → **401**; owner/manager/agent demo logins **200** with correct roles |
| Kanban stage move | Agent `new` → `contacted` → restore `new` (**200**, persisted) |
| wa.me handoff | `POST …/wa` with `template_key=first_response` → `https://wa.me/923001112233?text=…`; notice states app **never sends**; five templates on GET |
| Pages | `/dashboard`, `/board`, `/listings`, `/inquiries/new` **200**; `/today` **307** → `/dashboard` |
| Guide | `GUIDE-roman-urdu.md` present (113 lines); covers install/npm, demo logins, board/Kanban, inquiries, listings, CSV/import, WhatsApp/wa.me, troubleshooting, Team/password |

## Residuals (non-blocking)

- `GET` on `/api/imports/:id/{mapping,preview,commit}` returns **405** (method not allowed); mutating verbs correctly **403** for agents. Not a read leak.
- Register rate-limit counter increments on post-validation failures (workspace/email), not on early password-too-short **400** — acceptable; login **429** path live-verified.
- Soft rate limit remains in-memory / single-node (documented intentional MVP gap in `STATUS.md`).
- Live verification used an isolated build+DB under `/tmp/listingloop-qa` so concurrent agents would not corrupt `.next`; product tree was not modified.

## Gate

- Prior Team ACL ship blocker: **CLOSED**
- New P0/P1: **none**
- **CLEAR for publish from QA?** **yes**

