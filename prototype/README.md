# Sit — clickable prototype

Clickable prototype of **Sit**, Technopark's seat and room booking app, built from the _Foothill Prototype Specification_ (Oct 1, 2026).
All data is mocked in the browser: no server, no real SMS or email.

**Live:** https://talakherawish.github.io/sit/ (renter app) · https://talakherawish.github.io/sit/s/today (staff dashboard)

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/
npm run lint       # ESLint
npm run format     # Prettier (also sorts Tailwind classes)
npm run check-i18n # lists translation keys missing from en.json / ar.json
```

## Hosting

Every push to `main` builds and publishes the prototype to **GitHub Pages** via `.github/workflows/deploy.yml` (one-time setup: repo **Settings → Pages → Source: GitHub Actions**). The site lives at https://talakherawish.github.io/sit/. Netlify and Vercel configs are included too if you prefer either.

## Surfaces

| Prefix       | Surface                       | Notes                                                                                  |
| ------------ | ----------------------------- | -------------------------------------------------------------------------------------- |
| `/r/…`       | Renter app (R-01 – R-21)      | Rendered in a 390 px phone frame on desktop                                            |
| `/s/…`       | Staff dashboard (S-00 – S-10) | Full width, reception computer only                                                    |
| Hidden panel | Prototype panel (P-01 – P-04) | Reviewer-only: personas, switches, time simulator, outbox, analytics. Kept in English. |

Open the prototype panel by **tapping the Technopark logo three times**, pressing **Ctrl + .** (⌘ + . on a Mac), or adding `?panel` to the URL. It has no visible tab so the app looks like the real thing.

**Add to home screen:** open the live link on a phone and use Share → Add to Home Screen (iPhone) or Install app (Android); it gets the Technopark icon and opens full screen.

Why each design choice was made, and which UX principle it follows: [10-presentation/ai-refined/design-decisions.md](../10-presentation/ai-refined/design-decisions.md).

## Demo start state

The clock starts at **Thu 1 Oct 2026, 09:30**, and the app opens logged in as **Tala** with a lived-in account (bookings, alerts, reports, profile). Pick **Guest** in P-01 for the browse-without-an-account story (US-1). Seeded data lives in `src/data/mock-data.json`; "Reset all data" in P-01 reloads it.

- **Larine** (Arabic) — Big Room 2 today 15:00–17:00, awaiting confirmation, reminder 2 h before; one AC report in progress.
- **Tala** — recurring Focus Room 1, Sun–Thu 09:00–10:00 (checked in today), plus a client call in Focus Room 3 at 13:30 awaiting confirmation.
- **Omar** — no bookings; use him for the last-minute and "slot just taken" demos.

Any 4-digit code passes on R-11; the real code is in the P-03 outbox.

Screen IDs (R-06, S-01…) are hidden by default. Turn on **Show screen IDs** in P-01 to see them under each title and match screens to the spec.

Wi-Fi speed on Home and in the Wi-Fi sheet comes from mocked hourly speed tests (`speed_tests` on the Wi-Fi amenity in `mock-data.json`); the shown result follows the simulated clock.

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

## Look and feel

iOS idiom on a white page: a bezel-and-Dynamic-Island phone frame on desktop, frosted nav and tab bars, large titles, inset grouped lists and forms, segmented controls, switches, bottom sheets and alerts. The floor plan is drawn as an architectural plan (walls, door swings, windows, furniture; one circle per public seat).

Booking a room: tap it on the map (or in **Rooms**) and a sheet shows its whole opening day as a timeline, with booked, past and out-of-order stretches labelled. Tap a free time to start, tap another to stretch it, tap inside to shorten. **Book more days** in the same sheet adds a calendar to book that time on several days at once.

Two deliberate departures from the spec's _Visual design_ section, made on request:

- **Fonts:** the system font (SF Pro on Apple devices), then **Inter** from Google Fonts, then **IBM Plex Sans Arabic** for Arabic — instead of Barlow Semi Condensed.
- **Corners:** iOS radii (12–28 px) instead of 8 px.

The header uses the Technopark Palestine logo (`public/brand/`). Colours come from it: navy for actions and selection, teal for “free”/live, red only for alerts and unread badges, amber for “awaiting”. Text is #1D1D1F with #6E6E73 for secondary text (5:1 on white), and cards use a #F5F5F7 fill.

## Choices the spec left open

- **Daily status nudge (S-01):** the "No status posted today" banner clears when staff post a notice ticked _This is today's daily status_ (on by default for the first post of the day). The two seeded morning notices are ad-hoc, so the banner shows at start, as US-6 expects.
- **Time simulator (P-02)** jumps relative to a _target booking_ you pick (defaults to the logged-in persona's next booking, else Larine's), so US-4 works for Larine or Tala. Time only moves forward; use Reset to go back.
- **Placeholders to swap:** the Technopark logo (`TechnoparkLogo` in `components/Icon.jsx`) and room photos (`Photo` in `components/ui.jsx`) are drawn stand-ins; room names, counts and hours are placeholders.
