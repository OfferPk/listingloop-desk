# ListingLoop Desk — QA Report (Unreleased improve pack)

**Date:** 2026-09-28 17:17 PKT (Asia/Karachi)  
**Result: PASS**  
**Scope:** Unreleased improve atop v0.1.1 `98a00bb` — commit **`4e54975`** (`feat: Unreleased pack — onboarding checklist, locality filter, import cadence`). Does **not** re-litigate R2.  
**Prior:** `QA-REPORT-R2.md` (**PASS** v0.1.1). Brief: `/workspace/factory/inbox/IMPROVE-listingloop-desk-20260928-1707.md`.  
**Constraint:** Report only — no product source changes, no GitHub push, no agent messages.  
**HEAD verified:** `4e54975a305789562f85e6035db8e3c3b00eaead` (working tree clean for product files; `98a00bb` untouched).

## Executive summary

SE3 READY_FOR_QA claim holds. All three Master verify items live-checked against `COOKIE_SECURE=false PORT=3012 npm start` from an isolated build+DB under `/tmp/listingloop-qa-improve` (avoids concurrent `.next` races on the shared box). Automated suite **40/40** (10 files); production build green (Next.js 15.5.25). Agent correctly blocked from manager-only sample + imports. No new P0/P1. **CLEAR for improve merge/publish from QA.**

## Gates

| Gate | Result | Evidence |
|------|--------|----------|
| `npm test` | **PASS** | 10 files, **40/40** (incl. `sample-inquiry` 5, `locality-filter` 4) @ product tree `/workspace/factory/projects/listingloop-desk` |
| `npm run build` | **PASS** | Next.js 15.5.25 — compiled, lint/types OK, 23/23 routes; isolated copy `/tmp/listingloop-qa-improve` |
| Seed / demo logins | **PASS** | `npm run db:reset` → 6 listings / 12 inquiries; owner / manager / agent → `/api/auth/login` **200** (`COOKIE_SECURE=false`) |
| HEAD | `4e54975` on `98a00bb` | Unreleased pack; no version bump (stay 0.1.1 Unreleased per STATUS) |

## Scoped verify (Master)

### 1) Onboarding checklist + `POST /api/inquiries/sample` (manager) — **PASS**

| Check | Result | Evidence |
|-------|--------|----------|
| Sample API manager | **201** | `POST /api/inquiries/sample` → listing `SAMPLE-*` + inquiry “Sample Inquiry (Demo)”, `preferred_locality=DHA Phase 5`, `next_follow_up_at` today (e.g. `2026-09-28T06:00:00.000Z` = 11:00 PKT) |
| Sample API owner | **201** | Same shape |
| Sample API agent | **403** | `{"error":"Forbidden — owners/managers only"}` |
| Unauth sample | **401** | `{"error":"Unauthorized"}` |
| Checklist when empty | **PASS** | After wiping inquiries+listings in isolated DB: Dashboard / Board / Imports RSC props `show:true`, manager/owner `isManager:true` + `allowSample:true`; agent `isManager:false` + `allowSample:false` (no Seed CTA / Team step) |
| Checklist when seeded | **PASS** | Seeded dash/board/imports: no painted “Get started” (show false path); component still in client chunks |
| Bundle copy | **PASS** | Built chunks: “Get started in 3 steps”, Roman Urdu subtitle, 3 steps (listing → inquiry/Import CSV → Invite), `listingloop_onboarding_dismissed_${userId}`, “Seed sample inquiry”, “Dismiss / Chhupa do” |
| Unit | **PASS** | `tests/sample-inquiry.test.ts` — agent 403; manager seed + follow-up today |

Client checklist paints after hydration (`dismissed` starts true until `useEffect`) — curl SSR proves props + bundle, not painted DOM (same pattern as CodBooks/ClinicDesk).

### 2) Board locality filter wired — **PASS**

| Check | Result | Evidence |
|-------|--------|----------|
| Form input | **PASS** | `/board` HTML: `name="locality"` placeholder `City / locality` |
| Clear | **PASS** | Link `href="/board"` labeled Clear (resets query params) |
| Value round-trip | **PASS** | `GET /board?locality=DHA+Phase+5` → `name="locality" value="DHA Phase 5"` |
| API narrow | **PASS** | Manager `GET /api/inquiries?locality=DHA` → 6 (DHA listings/samples); `Bahria` → 2; `Phase%205` → 3; `NOMATCHXYZ` → 0 |
| Unit | **PASS** | `tests/locality-filter.test.ts` 4/4 — listing locality, preferred_locality, city join |

Lib already had `InquiryFilters.locality` LIKE; board form now exposes it (brief gap closed).

### 3) Imports empty CTA + cadence banner N=3 (manager/owner) — **PASS**

| Check | Result | Evidence |
|-------|--------|----------|
| Empty CTA | **PASS** | Manager `GET /imports` (0 jobs): “No imports yet”, “Portal or Meta lead CSV lands here…”, primary **Upload CSV** → `/imports/new` |
| Empty jobs → no banner | **PASS** | Seeded manager dash/imports: no “Re-upload portal CSV” |
| Stale successful (N=3) | **PASS** | Inserted `done` job `created_at` 2026-09-24 (~4d old): manager + owner dashboard/imports HTML show “Re-upload portal CSV → Import” + “Last successful import was over **3** days ago…”; RSC `remindDays:3` / `lastSuccessfulAt` set |
| Only failed jobs | **PASS** | After flipping job to `failed`: banner copy “Koi successful import nahi — portal / Meta CSV…”; RSC `lastSuccessfulAt: null` |
| Agents never | **PASS** | Agent dashboard: no cadence banner / no `ImportCadenceBanner`; nav has **no** `/imports` or `/team` (Dashboard/Board/Listings/Today/New inquiry only) |
| Agent imports gate | **PASS** | `GET /api/imports` **403**; `GET /imports` + `/imports/new` **307** → `/dashboard`; `POST /api/imports` **403**; `POST /api/inquiries/sample` **403** |
| Manager/owner nav | **PASS** | Includes **Import** + **Team** |
| Constant | **PASS** | `IMPORT_CADENCE_DAYS = 3` in `src/lib/imports.ts`; no settings UI |
| Unit | **PASS** | Cadence empty / failed-only / recent vs stale in `tests/sample-inquiry.test.ts` |

## P0 / new P1

**None.**

## Residuals / non-blockers

1. Checklist is client-hydrated (first paint empty until `useEffect`) — documented parity with sibling desks; RSC `show` props verified.
2. Single-workspace register (`Workspace already exists`) — cannot spin a second empty agency via UI without DB wipe; empty-state checklist verified by isolating DB wipe under `/tmp` only.
3. Soft rate limit / in-memory authz gaps remain intentional MVP (STATUS); out of this pack’s scope.
4. Live verify used isolated `/tmp/listingloop-qa-improve` build+DB; product tree not modified by QA. Concurrent Security agent left untracked `SECURITY-REPORT-IMPROVE-1715.md` — not part of this QA run.

## Gate

- Master items 1–3: **HOLD**
- New P0/P1: **none**
- **CLEAR for improve merge/publish from QA?** **yes**
