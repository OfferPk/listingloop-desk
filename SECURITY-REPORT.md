# ListingLoop Desk Security Report

**Review date:** 2026-09-21 18:31 PKT  
**Scope:** authz, sessions, CSV injection, path traversal, secrets, SQLite permissions  
**Verdict:** **FAIL — do not ship until the blockers below are remediated.**

## Ship blockers

### FAIL — Import authorization exposes workspace-wide lead data and permits unauthorized assignment

All import endpoints use `requireUser()` rather than a manager/owner authorization check (`src/app/api/imports/route.ts:15,24`; `src/app/api/imports/[jobId]/*`). Job reads are scoped only to `workspace_id` (`src/lib/imports.ts:117-120`), and the job response includes `rows_json`, which contains the uploaded raw CSV. Therefore an agent can read any workspace member's import, including uncommitted lead PII, and can preview/commit another user's job.

`updateMapping()` also lets any authenticated member select any active workspace member as `default_owner_id` (`src/lib/imports.ts:147-163`); commit then uses that owner without a role check (`src/lib/imports.ts:332-335`). This bypasses the documented agent boundary (agents see/operate their assigned queue only) and lets an agent create/import inquiries into another user's queue.

**Required before ship:** restrict import listing/read/mapping/preview/commit to owners/managers, or enforce uploader/assignment authorization with equivalent raw-row and commit isolation.

### FAIL — Agent can read the complete team roster and member email addresses

`GET /api/users` calls only `requireUser()` (`src/app/api/users/route.ts:6-16`), while the `/team` client page has no role check of its own (`src/app/(desk)/team/page.tsx:1-16`). An authenticated agent can directly request the API or page despite the UI hiding the navigation link, receiving every member's name and email. This violates the documented owner/manager-only team boundary and is not server-side authorization.

**Required before ship:** apply manager/owner authorization to the roster endpoint and page, or return only the minimum member data needed by an agent workflow.

### FAIL — CSV formula-injection mitigation is incomplete

`csvEscape()` prefixes only cells whose first character is exactly `=`, `+`, `-`, or `@` (`src/lib/csv.ts:1-5`). Spreadsheet payloads beginning with a tab, carriage return/newline, or leading whitespace can bypass that check while still being interpreted as formulas by spreadsheet clients. Quoting a cell does not neutralize its formula content.

**Required before ship:** neutralize leading whitespace/control characters and formula-triggering characters before export, with tests covering tab/CR/LF/space-prefixed payloads.

### FAIL — Known default credentials are shipped and prefilled

The seed creates active accounts with published passwords (`scripts/seed.ts:184-196`; `README.md:44-50`), and the login page prepopulates the owner email and password (`src/app/login/page.tsx:8-10`). The supplied `data/listingloop.db` contains the seeded user accounts. If the seeded DB or seed flow is deployed, anyone with the repository can authenticate as owner/manager/agent.

**Required before ship:** remove the seeded DB and demo defaults from production artifacts, prevent demo seeding in production, and require unique password setup/rotation before activation.

### FAIL — SQLite database and sidecars are world-readable

The supplied database is mode `0644`; the data directory is `0755`, and SQLite sidecar files are created without explicit restrictive modes. The database contains password hashes, workspace membership, and customer PII. `src/lib/db.ts:20-24` creates the directory/database without permission hardening.

**Required before ship:** run the service under a dedicated account, use a private data directory, and enforce database/WAL/SHM permissions no broader than owner read/write (typically directory `0700`, files `0600`). Do not package the current seeded database.

### FAIL — Production can issue non-Secure session cookies

`shouldUseSecureCookie()` honors `COOKIE_SECURE=false` (`src/lib/auth.ts:82-90`), and the shipped `.env.example` sets that value (`.env.example:1-2`). The session cookie is httpOnly and SameSite=Lax, but when this configuration is used it is still sent over HTTP and can be intercepted.

**Required before ship:** enforce HTTPS in production and set/force `COOKIE_SECURE=true`; do not allow a production configuration to override Secure to false.

## Passed checks

- **PASS — Path traversal:** request-controlled upload filenames are stored as database metadata only (`src/lib/imports.ts:101-105`); no request-controlled path is opened or written. `DATABASE_PATH` is deployment configuration, not user input.
- **PASS — Session fundamentals:** sessions use `crypto.randomUUID()`, server-side expiry, httpOnly, and SameSite=Lax (`src/lib/auth.ts:17-25,62-68,98-104`). The production Secure configuration still blocks shipment as noted above.
- **PASS — SQL injection baseline:** reviewed data queries use parameter binding; no dynamic SQL was built from request values in the reviewed paths.

## Verification

- `npm test`: 23 tests passed.
- `npm run build`: succeeded.
- No application code was changed; this report is the only review artifact added.
