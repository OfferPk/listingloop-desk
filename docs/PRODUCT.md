# ListingLoop Desk — Product

## One-liner

Match every property inquiry to a listing, an owner, and the next visit — then open WhatsApp in one click.

## Personas

- **Owner / manager** — workspace visibility, invite users, export CSV, filter board
- **Agent** — own queue, notes, wa.me handoff, stage moves, visits

## Core loop

1. Capture inquiry (name + phone + source + owner)
2. Match listing (optional)
3. Follow up / open WhatsApp (human send)
4. Schedule visit when stage → visit_scheduled
5. Win or lose with reason

## Roles

| Role    | Sees                         | Can invite | Can export |
|---------|------------------------------|------------|------------|
| owner   | All workspace inquiries      | Yes        | Yes        |
| manager | All workspace inquiries      | Yes        | Yes        |
| agent   | Assigned inquiries only      | No         | No         |

Authorization is enforced server-side on every API.

## Stages

`new` → `contacted` → `visit_scheduled` → `negotiation` → `won` / `lost`

Visit date/time is required when moving to `visit_scheduled`.

## WhatsApp

`https://wa.me/<digits>?text=…` only. UI states that the user must review and send.
