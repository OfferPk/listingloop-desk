# ListingLoop Desk — Istemaal Guide (Roman Urdu)

> Factory rule: har published project mein yeh file zaroori hai.

## 1. Yeh project kya hai?

ListingLoop Desk ek halka WhatsApp-first inquiry desk hai real-estate agencies ke liye.
Aap inquiries capture karte hain, listing se match karte hain, follow-up / visit set karte hain, aur `wa.me` se WhatsApp kholte hain — message aap khud review karke bhejte hain.

## 2. Kahan se download karein?

- Source / ZIP: factory project path `listingloop-desk` (GitHub publish baad mein).
- Local clone ke baad isi folder mein `npm install` karein.

## 3. Pehle kya chahiye? (requirements)

- Node.js 20+ (LTS recommended)
- npm
- Modern browser (Chrome / Edge / Firefox)
- WhatsApp desktop ya mobile (handoff ke liye)

## 4. Install + Run (step-by-step)

1. Project folder mein jayein:
   `cd listingloop-desk`
2. Dependencies:
   `npm install`
3. (Optional) env:
   `cp .env.example .env.local`
4. Demo data:
   `npm run seed`
5. Dev server:
   `npm run dev`
6. Browser: http://localhost:3000
7. Tests / build:
   `npm test`  
   `npm run build`

## 5. Demo login

| Role    | Email                     | Password   |
|---------|---------------------------|------------|
| Owner   | owner@listingloop.local   | owner12345 |
| Manager | manager@listingloop.local | manager12345 |
| Agent   | agent@listingloop.local   | agent12345 |

Pehli dafa register bhi ho sakta hai (sirf jab koi user na ho) — woh owner ban jata hai.

## 6. Features — har ek kya karta hai

### Dashboard (Today)
- **Kahan:** `/dashboard`
- **Kaise:** Login ke baad overdue follow-ups, aaj ki visits, new count dikhega.
- **Result:** Jaldi dekh lo kya urgent hai; “Add inquiry” se naya lead.

### Inquiry Board (Kanban)
- **Kahan:** `/board`
- **Kaise:** Filters (listing, owner, source, stage) + search. Card pe stage move buttons.
- **Result:** Stage save hoti hai; visit_scheduled pe date/time mangta hai.

### New inquiry
- **Kahan:** `/inquiries/new`
- **Kaise:** Name + phone (03… auto 92…), source, owner, optional listing/budget.
- **Result:** Inquiry `new` stage pe create.

### Inquiry detail + WhatsApp
- **Kahan:** `/inquiries/[id]`
- **Kaise:** Stage move, note presets, WhatsApp template edit karke “Open WhatsApp”.
- **Result:** WhatsApp draft khulta hai — **aap Send dabate hain**. App message nahi bhejti.

### Listings
- **Kahan:** `/listings`
- **Kaise:** Create/edit; status active/paused/archived.
- **Result:** Archived nayi inquiry pe select nahi hota (default).

### CSV Import
- **Kahan:** `/imports` → upload → map columns → preview → commit
- **Kaise:** Name + phone map zaroori. Dedupe phone (+ external_ref).
- **Result:** Created / duplicate / invalid counts.

### CSV Export
- **Kahan:** Nav “Export CSV” (owner/manager)
- **Kaise:** Click → `inquiries.csv` download (formula-safe).
- **Result:** UTF-8 CSV team ke liye.

### Team invite
- **Kahan:** `/team` (owner/manager)
- **Kaise:** Name, email, temp password, role.
- **Result:** Naya member login kar sakta hai.

## 7. Common masail (troubleshooting)

- **Login fail:** `npm run seed` dubara chalao; email/password table check karo.
- **DB lock / weird data:** `npm run db:reset`
- **Phone invalid:** Country code ke sath likho, e.g. `923001234567` ya `03001234567`.
- **Build fail (better-sqlite3):** Node version match karo; `npm rebuild better-sqlite3`.
- **Cookie / session lost on HTTP:** `.env.local` mein `COOKIE_SECURE=false`.
- **Agent ko dusri inquiries nahi dikhti:** By design — sirf assigned.

## 8. Security / privacy tips

- Password min **10** chars; login/register pe soft rate limit (429).
- Production mein strong passwords + `COOKIE_SECURE=true` (HTTPS).
- Team + CSV Import sirf owner/manager — agents ko nav hide + server redirect.
- CSV / phones sensitive hain — public share mat karo.
- WhatsApp handoff intentional hai; bulk spam / unofficial WA libs mat jodo.
- Workspace isolation server-side hai — URL mein ID change karke dusra workspace nahi milna chahiye.
- `.env.local` aur `data/*.db` git mein commit mat karo.

## 9. Agla update

- Design-partner feedback ke baad filters polish, richer activity.
- Meta/portal live sync MVP ke bahar hai.
