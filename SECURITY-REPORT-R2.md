# ListingLoop Desk — SECURITY-REPORT-R2

**Project:** ListingLoop Desk  
**Version under review:** 0.1.1  
**Review date:** 2026-09-28 (Asia/Karachi)  
**Reviewer:** Security R2 (factory desk)  
**Scope:** Prior FAIL re-verify (roster + import), SE3 claims, session cookies, SQLite perms, secrets gitignore, CSV export injection.  
**Method:** Static review of auth/API/pages/Nav/csv/rate-limit + `npm test` (no code edits, no push).

## Verdict: **PASS_WITH_NOTES**

Prior ship-blocking authz FAILs are remediated server-side. SE3 claims verified. Residual deploy/demo hygiene notes remain; **no ship blockers** for OfferPk patch tag **v0.1.1**.

## Ship blockers

**None.**

## Prior FAIL re-verify

| # | Prior FAIL | R2 finding | Status |
|---|------------|------------|--------|
| 1 | Agent roster leak via `GET /api/users` + `/team` | `requireManager()` on `GET`/`POST` `/api/users`; `/team` server-gates with `requireManager` (401→login, else→dashboard). Nav hides Team for agents. | **FIXED** |
| 2 | Import pipeline PII/reassign for any agent | All `/api/imports*` routes use `requireManager`; `(desk)/imports/layout.tsx` + pages gate; Import nav hidden for agents. Mapping/`default_owner_id` only reachable by manager/owner. | **FIXED** |
| 3 | CSV formula-injection incomplete | `csvEscape` prefixes when leading whitespace/control (`\s` + `\u0000-\u001f`) then `=+-@`. Tests cover tab/CR/space. Export uses `toCsv` + manager/owner gate. | **FIXED** |
| 4 | Known default credentials shipped/prefilled | Seed + README still publish demo passwords (now min-10). Login still prefills email + **stale** `owner123` (seed is `owner12345`). DB file gitignored. | **NOTE** (intentional demo; do not ship seed DB to prod) |
| 5 | SQLite world-readable (0644) | `getDb()` now `chmodSync(dbPath, 0o600)`. **On-disk after `npm run seed`:** `data/listingloop.db` still **0644** (seed opens DB without chmod); `data/` dir **0755**. No WAL/SHM present at review. | **NOTE** (partial) |
| 6 | Production can set non-Secure cookies | Cookie remains httpOnly + SameSite=Lax + UUID session. `COOKIE_SECURE=false` still honored; `.env.example` still sets it. | **NOTE** (force Secure in real HTTPS prod) |

## SE3 claims checklist

| Claim | Evidence | Result |
|-------|----------|--------|
| `requireManager` on users + imports APIs + pages | `src/app/api/users/route.ts`; all `src/app/api/imports/**`; `team/page.tsx`; `imports/layout.tsx` + pages | **PASS** |
| Nav hide for agents | `Nav.tsx`: Import/Team only for owner/manager; Export CSV same | **PASS** |
| Password min 10 | Register + users invite API; UI `minLength={10}`; seed passwords length 10+ | **PASS** |
| Rate limit → 429 | Login/register in-memory ≤10 fails / 15 min; test asserts 429 | **PASS** (single-node; documented) |
| `csvEscape` | Leading ws/control + formula chars; export route uses it | **PASS** |
| Visit outcome PATCH | `PATCH .../visits/[visitId]`; agent own / manager any (`updateVisit`) | **PASS** |
| Tests 31/31 | `npm test` → **31 passed** (8 files), 2026-09-28 | **PASS** |

## Also checked

- **Session cookies:** `crypto.randomUUID()`, server expiry 14d, httpOnly, SameSite=Lax. Secure depends on `COOKIE_SECURE` / `x-forwarded-proto` / `NODE_ENV` (see note above).
- **Secrets gitignore:** `.env`, `.env*.local`, `data/*.db`, `data/*.db-*` ignored. Only `data/.gitkeep` + `.env.example` tracked. **PASS** for repo leak of DB/env.
- **CSV export authz:** manager/owner only → 403 for agents.
- **Manager gate unit test:** `assertManagerRole(agent)` → 403 (covers gate used by users/imports).

## Sign-off for v0.1.1 patch

Cleared for OfferPk **v0.1.1** patch tag on security grounds for the prior authz blockers and SE3 scope.

**Follow-ups (non-blocking for this tag):**

1. Seed/`getDb` path: chmod DB (+ WAL/SHM) to `0600`; prefer `data/` `0700`.
2. Production: set `COOKIE_SECURE=true`; do not copy `.env.example`’s `false` into HTTPS prod.
3. Demo: empty login prefill (or sync to `owner12345`); never package seeded `listingloop.db` in production artifacts.

**Artifacts:** this report only. No application code changed. No push.
