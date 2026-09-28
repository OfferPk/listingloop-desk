# ListingLoop Desk — SECURITY-REPORT-IMPROVE-1715

**Project:** ListingLoop Desk  
**Scope:** Unreleased pack (onboarding checklist, locality filter, import cadence, sample inquiry API)  
**HEAD:** `4e54975` — feat: Unreleased pack — onboarding checklist, locality filter, import cadence  
**Base release:** `98a00bb` ListingLoop Desk v0.1.1 — Security R2 `PASS_WITH_NOTES` (`SECURITY-REPORT-R2.md`)  
**Review date:** 2026-09-28 ~17:15 PKT (Asia/Karachi)  
**Reviewer:** Security Reviewer (factory desk)  
**Method:** Static review of delta + R2 regression surfaces; `npm test`; optional `npm audit --omit=dev`. **No product code edits. No git push.**

## Verdict: **PASS_WITH_NOTES**

Delta authz and injection controls meet the release gate. R2 ship controls still hold. Residual notes are non-blocking (LIKE metacharacter broaden, call-site cadence gate, R2 deploy/demo hygiene). **No ship blockers.**

## Ship blockers

**None.**

## Focus findings (delta)

### 1. Sample seed endpoint authz — `POST /api/inquiries/sample`

| Check | Evidence | Result |
|-------|----------|--------|
| Server `requireManager` (not UI-only) | `src/app/api/inquiries/sample/route.ts:7` → `requireManager()` | **PASS** |
| Defense-in-depth role check in lib | `createSampleInquiry` → `isManagerOrOwner` else 403 (`src/lib/inquiries.ts:687-689`) | **PASS** |
| Agent forbidden | `tests/sample-inquiry.test.ts` “rejects agent with 403” | **PASS** |
| Creates only in caller workspace | `createListing` / `createInquiry` use `user.workspace_id`; owner_id = `user.id` (`inquiries.ts:691-715`) | **PASS** |
| No privilege escalation | Agent cannot call route; no cross-workspace id input; listing_ref `SAMPLE-*` in actor workspace | **PASS** |
| No mass data wipe | Path is INSERT-only (listing + inquiry); no DELETE/TRUNCATE/DROP | **PASS** |
| Sample CTA still hits gated API | `OnboardingChecklist.tsx:95` `POST /api/inquiries/sample`; CTA only if `allowSample && isManager` (`:160`) | **PASS** |

### 2. Locality filter injection — board / `listInquiries`

| Check | Evidence | Result |
|-------|----------|--------|
| Parameterized `LIKE` (no SQLi) | `inquiries.ts:86-90` binds `like` via `?` params; SQL string not concatenated with raw filter text | **PASS** — no SQL injection |
| `workspace_id` scoped | `listInquiries` always `WHERE i.workspace_id = ?` (`:64-65`); agents also `owner_id = ?` (`:66-68`) | **PASS** |
| Board wires filter | `board/page.tsx:22` `locality: sp.locality`; input `name="locality"` (`:52-56`); Clear → `/board` | **PASS** |
| LIKE metacharacters `%` / `_` escaped? | **Not escaped.** `%${filters.locality}%` (`:87`). Same pattern as existing `q` filter (`:92-96`). | **NOTE — Low** |

**Severity note (LIKE meta):** Authenticated, workspace-scoped (and owner-scoped for agents). Attacker can only *broaden* matches within already-authorized rows (e.g. locality=`%` ≈ no locality filter). Cannot break out of SQL, other workspaces, or bypass agent owner scope. **Not a ship blocker.** Optional hardening: escape `%`/`_`/`\` in filter before wrapping.

### 3. Imports cadence authz

| Check | Evidence | Result |
|-------|----------|--------|
| Cadence data only for manager/owner | Dashboard: `isManager ? getImportCadenceState(user) : { show:false…}` (`dashboard/page.tsx:18-20`); banner `{isManager && (` (`:39-45`) | **PASS** |
| Agents never see cadence UI/stats | Agents never call `getImportCadenceState` on dashboard; Import nav + `/imports/**` still manager-gated | **PASS** |
| Imports page/API still `requireManager` | `imports/page.tsx:11`; `imports/layout.tsx:8`; all `/api/imports*` routes unchanged | **PASS** |
| Cadence query scoped | `getImportCadenceState` → `WHERE workspace_id = ?` (`imports.ts:555`); returns only `show` + `lastSuccessfulAt` (no lead PII) | **PASS** |
| Lib asserts role? | Comment “Manager/owner only at call site” (`imports.ts:548`); function itself does not call `assertManagerRole` | **NOTE — Informational** |

**Note:** Call-site gating is correct today. If a future agent-reachable page imports `getImportCadenceState` without a role check, agents could learn whether the workspace has stale/failed imports (timing metadata only). Prefer asserting manager inside the helper for defense-in-depth (non-blocking).

### 4. Onboarding checklist

| Check | Evidence | Result |
|-------|----------|--------|
| Dismiss = localStorage only | Key `listingloop_onboarding_dismissed_${userId}` (`OnboardingChecklist.tsx:44-45, 66-69, 82-88`) | **PASS** |
| Manager steps / Import / Team links | Filtered by `isManager` / `managerExtraOnly` | **PASS** |
| Sample CTA → manager API | As in §1 | **PASS** |

### 5. Session / secrets hygiene

| Check | Evidence | Result |
|-------|----------|--------|
| Cookies httpOnly + SameSite=Lax | `auth.ts:99-101` (`httpOnly: true`, `sameSite: "lax"`, `secure: shouldUseSecureCookie`) | **PASS** |
| Secure flag | Env / `x-forwarded-proto` / `NODE_ENV`; `.env.example` still `COOKIE_SECURE=false` | **NOTE** (R2 carry-forward) |
| No secrets in `src` | No hard-coded API keys/tokens; passwords only via forms → bcrypt | **PASS** |
| `.gitignore` | `data/*.db`, `data/*.db-*`, `.env`, `.env*.local` | **PASS** |
| Tracked env | Only `.env.example` (placeholders). DB not tracked (`data/.gitkeep` only) | **PASS** |

## R2 regression — Still OK

| R2 ship control | Status |
|-----------------|--------|
| `requireManager` on users + imports APIs/pages | **Still OK** — users route; all imports API + layout/pages |
| Nav hide Import/Team for agents | **Still OK** — `Nav.tsx:14-31` |
| Password min 10 | **Still OK** — register + invite API + UI `minLength={10}` |
| Rate limit → 429 | **Still OK** — login/register; `auth-hygiene` test |
| `csvEscape` leading ws/control + `=+-@` | **Still OK** — `csv.ts` unchanged |
| Visit outcome PATCH (agent own / manager any) | **Still OK** — route + `updateVisit` |
| Secrets gitignore | **Still OK** |

## Verification

| Command | Result |
|---------|--------|
| `npm test` | **40 passed** (10 files) — includes `locality-filter` + `sample-inquiry` |
| `npm audit --omit=dev` | **0 vulnerabilities** |

## Notes (non-blocking)

1. **LIKE `%`/`_` not escaped** on locality (and existing `q`) — Low; see §2.
2. **`getImportCadenceState` call-site authz only** — Informational defense-in-depth; see §3.
3. **R2 carry-forwards still open:** force `COOKIE_SECURE=true` on HTTPS prod; chmod DB/`data/` tighter; do not ship seeded DB; demo login prefill hygiene.
4. Demo passwords remain documented (`owner12345` / etc.) — intentional for MVP; not a new delta risk.

## Sign-off

**PASS_WITH_NOTES** for Unreleased pack at HEAD `4e54975`. Cleared on security grounds for Master/QA handoff; no ship blockers; R2 controls not regressed.

**Artifacts:** this report only. No application code changed. No push.
