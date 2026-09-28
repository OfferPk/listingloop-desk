# ListingLoop Desk — SECURITY-REPORT-IMPROVE-1751

**Project:** ListingLoop Desk  
**Scope:** Unreleased pack post-v0.1.2 — board hide closed, lost-reason chips, export stage + date filters  
**HEAD:** `867b688` — feat: Unreleased pack — board hide closed, lost chips, export filters  
**Base release:** `2a00a69` ListingLoop Desk v0.1.2 — prior Security IMPROVE-1715 `PASS_WITH_NOTES` on `4e54975` / release; also R2 `PASS_WITH_NOTES`  
**Review date:** 2026-09-28 ~17:52 PKT (Asia/Karachi)  
**Reviewer:** Security Reviewer (factory desk)  
**Gate:** `/workspace/factory/shared/security/RELEASE_GATE.md`  
**Method:** Static review of Unreleased delta + R2/1715 regression surfaces; `npm test`; optional `npm audit --omit=dev`. **No product code edits. No git push.**

## Verdict: **PASS_WITH_NOTES**

Delta authz and injection controls meet the release gate. Closed toggle is UI-only column filter under existing auth/workspace scope. Lost-reason clamp + parameterized update + React text render are safe. Export filters are manager/owner-gated with YYYY-MM-DD validation, allowlisted stages, parameterized SQL, and `csvEscape` on cells. R2 ship controls still hold. Residual notes are non-blocking (LIKE metacharacter broaden carry-forward, lib-layer date re-validation optional, R2 deploy/demo hygiene). **No ship blockers.**

## Ship blockers

**None.**

## Focus findings (delta)

### 1. Closed toggle authz — board `?closed=` / `?show=`

| Check | Evidence | Result |
|-------|----------|--------|
| Board still auth-gated | `(desk)/layout.tsx` redirects unauthenticated → `/login`; `board/page.tsx:19` `requireUser()` | **PASS** |
| Toggle is UI-only column filter | `parseBoardShowClosed` / `boardVisibleStages` (`board-filter.ts:7-32`); page uses result only for `visibleStages` (`board/page.tsx:21-22,143`) | **PASS** |
| No privilege escalation | Query params only change which Kanban columns paint; no role elevation, no cross-workspace id, no bypass of agent owner scope | **PASS** |
| Workspace scoping intact | `listInquiries` always `WHERE i.workspace_id = ?` (`inquiries.ts:80-81`); agents also `owner_id = ?` (`:82-85`) | **PASS** |
| Explicit `stage=won\|lost` still works | `boardVisibleStages(false, "won"\|"lost")` appends that column (`board-filter.ts:29-30`); tested in `board-filter.test.ts` | **PASS** |
| Data still fetched for all stages when closed hidden | `listInquiries` without stage filter returns won/lost rows; columns omit them — intentional UI hide, not an authz boundary change | **PASS** (by design) |

**Note:** Hiding closed columns does not remove won/lost from the SSR `inquiries` prop. Agents already may see their own closed inquiries via detail / stage filter; managers see workspace-scoped set. No IDOR introduced.

### 2. `lost_reason` length / sanitize / XSS / SQL

| Check | Evidence | Result |
|-------|----------|--------|
| MAX 120 | `MAX_LOST_REASON_LENGTH = 120` (`types.ts:119`); UI `maxLength` (`LostReasonPicker.tsx:93`); server `clampLostReason` slice (`inquiries.ts:52-56`) | **PASS** |
| Presets + Skip→null | Presets in `types.ts:101-107`; Skip calls `onConfirm(null)` (`LostReasonPicker.tsx:49-51`); `moveStage` passes null (`inquiries.ts:408-410`) | **PASS** |
| Clamp on create + update | `createInquiry` / `updateInquiry` use `clampLostReason` (`inquiries.ts:261,367-368`) | **PASS** |
| SQL parameterized | `UPDATE ... lost_reason=? ... WHERE id=? AND workspace_id=?` (`inquiries.ts:325-372`) | **PASS** |
| No XSS if rendered | Detail: React text `{inquiry.lost_reason}` (`inquiries/[id]/page.tsx:46`); no `dangerouslySetInnerHTML` in app/components for this field | **PASS** |
| Auth on PATCH | `PATCH /api/inquiries/[id]` → `requireUser` + `moveStage`/`updateInquiry` → `loadInquiry` workspace + `canSee` (`route.ts:26-33`; `inquiries.ts:38-44`) | **PASS** |
| Tests | `lost-reason.test.ts` — preset label, Skip→null, clamp length | **PASS** |

### 3. Export filters — SQLi + manager-only

| Check | Evidence | Result |
|-------|----------|--------|
| Manager/owner only (API) | `requireUser` + `isManagerOrOwner` else **403** (`export/inquiries.csv/route.ts:18-20`) — equivalent to requireManager for agents | **PASS** |
| Page gate + agent redirect | `/export` `requireUser` + `isManagerOrOwner` else `redirect("/dashboard")` (`export/page.tsx:6-8`) | **PASS** |
| Nav Export gated | `MANAGER_LINKS` includes `/export`; agents get `BASE_LINKS` only; Export CSV button role-gated (`Nav.tsx:14-32,68-71`) | **PASS** |
| Stage allowlist | Split/trim; keep only `STAGES.includes`; empty → **400** (`route.ts:36-44`); lib IN/`=` with `?` params (`inquiries.ts:98-109`) | **PASS** — no SQLi |
| `from`/`to` YYYY-MM-DD | `ISO_DATE = /^\d{4}-\d{2}-\d{2}$/` → **400** if invalid (`route.ts:7,28-33`) | **PASS** |
| Date predicates parameterized | `substr(i.created_at, 1, 10) >= ?` / `<= ?` with bound params (`inquiries.ts:112-118`) | **PASS** — no SQLi |
| Window on `created_at` | Documented + implemented (not `updated_at`) | **PASS** |
| `csvEscape` on cells | `toCsv(headers, rows)` → `csvEscape` (`csv.ts:2-20`; route `:94`) | **PASS** — Still OK vs R2 |
| Workspace scope on export rows | `listInquiries(user, …)` always scopes `workspace_id` | **PASS** |
| Tests | `export-filter.test.ts` — single/comma stage, from/to window, combine | **PASS** |

**Informational (non-blocking):** `listInquiries` accepts `from`/`to` without re-validating ISO at the lib layer. Today only the export route supplies them (after regex). Values remain bound parameters, so malformed strings cannot inject SQL; optional hardening is to assert `ISO_DATE` inside `listInquiries` for defense-in-depth.

## R2 / 1715 regression — Still OK

| Ship control | Status |
|--------------|--------|
| `requireManager` on users + imports APIs/pages | **Still OK** — `api/users`, all `api/imports*`, `imports/layout` + pages, `team/page` |
| Nav hide Import / Team / Export for agents | **Still OK** — `Nav.tsx` `MANAGER_LINKS` |
| Password min 10 | **Still OK** — register + invite API |
| Rate limit → 429 | **Still OK** — login/register; `auth-hygiene` test |
| `csvEscape` leading ws/control + `=+-@` | **Still OK** — `csv.ts` unchanged; export still uses `toCsv` |
| Visit outcome PATCH (agent own / manager any) | **Still OK** — unchanged path |
| Sample inquiry API manager-only (1715) | **Still OK** — not touched in this pack |
| Secrets gitignore | **Still OK** |

## Verification

| Command | Result |
|---------|--------|
| `npm test` | **54 passed** (13 files) — includes `board-filter`, `lost-reason`, `export-filter` |
| `npm audit --omit=dev` | **0 vulnerabilities** |
| `git rev-parse HEAD` | `867b6885139d31fedc3e64ee3ef731d116b892e1` |

## Notes (non-blocking)

1. **LIKE `%`/`_` not escaped** on locality (and existing `q`) — Low; carry-forward from IMPROVE-1715. Authenticated, workspace-/owner-scoped; can only broaden matches within authorized rows. Not a ship blocker.
2. **`listInquiries` date window** — optional ISO re-validation at lib layer (export route already validates). Informational.
3. **`getImportCadenceState` call-site authz only** — Informational; carry-forward from 1715.
4. **R2 deploy/demo hygiene still open:** force `COOKIE_SECURE=true` on HTTPS prod; chmod DB/`data/` tighter; do not ship seeded DB; demo login prefill hygiene.
5. Demo passwords remain documented (`owner12345` / etc.) — intentional for MVP; unchanged this pack.

## Sign-off

**PASS_WITH_NOTES** for Unreleased pack at HEAD `867b688`. Cleared on security grounds for Master/QA handoff; **no ship blockers**; R2 / 1715 controls not regressed.

**Artifacts:** this report only. No application code changed. No push.
