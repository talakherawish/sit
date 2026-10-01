# Sit — clickable prototype

Clickable prototype of **Sit**, Technopark's seat and room booking app, built from the *Foothill Prototype Specification* (Oct 1, 2026).
All data is mocked in the browser: no server, no real SMS or email.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (Netlify / Vercel config included)
npm run check-i18n # lists translation keys missing from en.json / ar.json
```

## Surfaces

| Prefix | Surface | Notes |
|---|---|---|
| `/r/…` | Renter app (R-01 – R-21) | Rendered in a 390 px phone frame on desktop |
| `/s/…` | Staff dashboard (S-00 – S-10) | Full width, reception computer only |
| ⚙ tab on the right | Prototype panel (P-01 – P-04) | Reviewer-only: personas, switches, time simulator, outbox, analytics. Kept in English. |

## Demo start state

The clock starts at **Thu 1 Oct 2026, 09:30**. Seeded data lives in `src/data/mock-data.json`; "Reset all data" in P-01 reloads it.

- **Larine** (Arabic) — Big Room 2 today 15:00–17:00, awaiting confirmation, reminder 2 h before; one AC report in progress.
- **Mohammad** — recurring Focus Room 1, Sun–Thu 09:00–10:00, checked in today.
- **Omar** — no bookings; use him for the last-minute and "slot just taken" demos.

Any 4-digit code passes on R-11; the real code is in the P-03 outbox.

## Where things live

```
src/
  data/mock-data.json   rooms, zones, hours, renters, bookings, notices, reports, insights history
  i18n/                 en.json, ar.json (Arabic switches the layout to right-to-left)
  store/                one Zustand store: bookings, seats, notices, reports, messages, events + time rules
  lib/                  time helpers, booking/availability logic, shared hooks
  components/           FloorPlan, BookingForm, mode chips / when bar, UI primitives
  renter/               R-01 … R-21
  staff/                S-00 … S-10
  prototype/            P-01 … P-04 drawer
```

## Choices the spec left open

- **Daily status nudge (S-01):** the "No status posted today" banner clears when staff post a notice ticked *This is today's daily status* (on by default for the first post of the day). The two seeded morning notices are ad-hoc, so the banner shows at start, as US-6 expects.
- **Time simulator (P-02)** jumps relative to a *target booking* you pick (defaults to the logged-in persona's next booking, else Larine's), so US-4 works for Larine or Mohammad. Time only moves forward; use Reset to go back.
- **Secondary text colour:** brand-grey `#6B7B7A` is 4.4:1 on white, just under the 4.5:1 rule, so small text uses a slightly darker `#56656A`. Brand-grey is still used for borders and disabled states.
- **Placeholders to swap:** the Technopark logo (`TechnoparkLogo` in `components/Icon.jsx`) and room photos (`Photo` in `components/ui.jsx`) are drawn stand-ins; room names, counts and hours are placeholders.
