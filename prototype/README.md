# Sit — clickable prototype

Clickable prototype of **Sit**, Technopark's seat and room booking app, built from the _Foothill Prototype Specification_ (Oct 1, 2026).
All data is mocked in the browser: no server, no real SMS or email.

**Live:** https://talakherawish.github.io/sit/renter (renter app) · https://talakherawish.github.io/sit/staff (staff dashboard) · https://talakherawish.github.io/sit/demo (both side by side, sharing live data, for presenting) · https://talakherawish.github.io/sit/wireframes/ (wireframes)

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

| Prefix       | Surface                       | Notes                                                                                     |
| ------------ | ----------------------------- | ----------------------------------------------------------------------------------------- |
| `/r/…`       | Renter app (R-01 – R-18)      | Phone first; rendered in a 390 px phone frame on desktop. Tabs: Today · Book ahead · My bookings |
| `/s/…`       | Staff dashboard (S-00 – S-10) | Full width, reception computer only                                                       |
| `/demo`      | Side-by-side demo             | Tala's phone and Rana's reception dashboard, sharing live data                            |
| Hidden panel | Prototype panel (P-01 – P-04) | Reviewer-only: personas, switches, time simulator, outbox, analytics. Kept in English.    |

Features planned for later sprints (rating, the rest of the profile — birthday, contact preference, booking history — staff insights and room-down) are not in this build. **Repeat bookings**, a first slice of the profile (the **Account** sheet) and reception's **Book for someone** were brought forward after review feedback.

Open the prototype panel by **tapping the Technopark logo three times**, pressing **Ctrl + .** (⌘ + . on a Mac), or adding `?panel` to the URL. It has no visible tab so the app looks like the real thing.

**Add to home screen:** open the live link on a phone and use Share → Add to Home Screen (iPhone) or Install app (Android); it gets the Technopark icon and opens full screen.

Why each design choice was made, and which UX principle it follows: [AI-USAGE-LOG.pdf](../AI-USAGE-LOG.pdf) (part 3, design decisions). Changes made since then, and what the documents still need: [DOC-CHANGES.md](../DOC-CHANGES.md).

## Renter app

Built around the product vision, _"Know before you go and sit where you booked, every single time"_: **Today** is know before you go, **My bookings** is sit where you booked, and **Book ahead** covers later days and repeats.

- **Today (R-01):** only about today. First the live **free seats** (big number, "18 of 40 taken" beside it), opening hours, cafeteria, Wi-Fi speed and staff notices. Then **Your next booking**: the closest booking today that hasn't started, with **Confirm** (when it's waiting) and **Cancel**. Then **Rooms today**: one column per room, starting at the current hour. **Book without leaving the page:** tap a free time to pick it (deep blue; tap another free time in that room to stretch it, inside to shorten it), and a panel rises above the tab bar with the room and time, the reminder (or "Starts within 2 hours, so it's confirmed now") and **Confirm** — no "What's it for?", no new page. **2 taps to book**, then the receipt. Booking from Today is for today only; **Book another day** goes to Book ahead.
- **Book ahead (R-02):** later days and repeating bookings, as **one form filled in from top to bottom**:
  1. **Days** on a month calendar (tap as many as you need).
  2. **Repeat** in one row: **Weekly · Monthly · Until <date>**. Tap to pick, tap again to unpick; nothing picked = no repeat. Picking one fills in Until (a month ahead for weekly, six for monthly); tap Until to change it (up to 12 months).
  3. **Time:** From and To side by side.
  4. **Room** on the floor plan: rooms free on every date are highlighted, rooms free on only some are amber with "29 / 34", the rest are faded. **No date is ever skipped:** pick any room and, on the dates it's taken, **Your schedule** under it puts you in another room (highlighted on the map), or splits the time across rooms ("10:00–11:00 · Focus Room 1, 11:00–12:00 · Room 1"). Only a half hour when every room is taken can't be booked; it's shown in red. If no single room is free on every date, **Pick one for me** picks the room free most often. The picked room's card links to **Room details**.
  5. **What are you here to do?** (optional; becomes the booking's reason).
  6. **Confirm** books it, with a reminder the day before each booking. No Review screen: a **receipt** rises from the bottom, holds, then leaves off the top, and "Booked · Undo" appears.
- **Room details (R-03):** photos, size, capacity and features, then this room's **availability**: a month calendar with a dot per day (teal = free time, amber = under an hour left, grey = fully booked) and the picked day's bookings as a timeline. Book this room goes to Review for today, or into the Book ahead form (room, day and time filled in) for later days.
- **Review (R-06)**, used from Room details (today) and Book again: a one-screen summary. The reason is **optional**. Reminder options, or "Starts within 2 hours, so it's confirmed now". Days where the room is taken or you're already booked are skipped, with a note.
- **My bookings (R-13):** a switch beside the title flips between **Cards** and **Calendar**. Cards: Upcoming / Past, sort, a repeating booking counts once ("+19 more" to expand), Confirm / Change / Cancel before it starts, **Report a problem** once it has started and on past visits, Book again. Calendar: a month view with a dot per booking (amber = waiting for you, navy = confirmed or used, grey = cancelled or released); tap a day to see its bookings as cards.
- **Account (avatar):** name and contact, language, My reports (R-17), **Report a problem** (R-16, soft red with a flag) and Log out. Guests get a language switch and **Log in** in the header instead.
- **Report a problem (R-16):** from Account (pick where), or from a booking, which fills in the room and time; reception then sees which booking it's about.

## Staff dashboard

- **Seat card (S-01):** + / − count the people in the open area; under it, **"22 seats free"**, which is what renters see on Today. The top bar shows the same: "22 seats free · 18 / 40".
- **Rooms today:** one row per room, bookings coloured by state (awaiting amber, confirmed light navy, checked in solid navy). Labels fit the space: name and times, name and start, or just the name (the rest is in the tooltip). Click a booking to check its renter in.
- **Today's bookings:** status shows Awaiting confirmation / Confirmed / Checked in / No-show…, so a renter confirming from their phone shows up straight away; repeating bookings get a repeat mark; a booking without a reason shows "—".
- **Book for someone (S-07):** the renter's Book ahead form at the desk, in two columns. Pick who it's for (search by name or phone, or add a new renter), then days → repeat → from / to on the left, and the map, what they're here to do and **Book for <name>** on the right. Each room's card has **See availability** (its month calendar and a day's bookings, without leaving the form). The renter gets an SMS and an alert; reception sees the same receipt. Opened from the sidebar, **Book for someone** on Rooms today, or **Book** next to a person on Check-in (already picked).
- **Reports inbox (S-05):** a report sent from a booking shows which booking ("Booking · Thu 1 Oct · 09:00–10:00").
- **People (S-06):** every renter account (contact details, how they like to be contacted, upcoming bookings — a repeating booking counts once — visits, whether they are inside now) and every visit, newest first, with the people inside now at the top. Search filters both lists; click a row to check that person in. People counted only with + / − on the seat counter are not named, so they are not listed.

**Staff and renter stay in sync:** bookings, check-ins, seats, notices, reports and the simulated clock are shared between every open tab of the same browser (and kept across reloads), so a check-in on the staff dashboard shows up straight away in the renter app. There is no server, so two _different_ devices (e.g. staff laptop and your phone) do not share data. "Reset all data" in P-01 resets every tab.

**Alerts:** when something changes for the signed-in renter (reception updates a report, a reminder is due, a booking is released or cancelled, a notice affects their booking), a banner drops in at the top of the app and the bell gets a red dot until they open Notifications (R-18).

## Demo start state

The clock starts at **Sun 4 Oct 2026, 09:30**, and the app opens logged in as **Tala** with one booking in every state (awaiting, confirmed, checked in, used, cancelled, cancelled by reception, released, and a repeating course). Everyone else has only what the demo needs, so most rooms and days are free. Pick **Guest** in P-01 for the browse-without-an-account story (US-1). Seeded data lives in `src/data/mock-data.json`; "Reset all data" in P-01 (or **Reset demo** on `/demo`) reloads it.

- **Tala Kherawish** — Focus Room 1 09:00–10:00 (checked in today), a client call in Focus Room 3 at 13:30 awaiting confirmation (**Your next booking** on her Today screen), and a Mon & Wed course in Focus Room 2, 16:00–17:30.
- **Leen Anabtawi** (Arabic) — Room 2 today 15:00–17:00, awaiting confirmation, reminder 2 h before; one AC report in progress.
- **Fatima Alkilani** — Room 1 at 12:00 today, booked by reception.
- **Shahd Mallah** — no bookings.
- **Ahmed Salamh** — no bookings yet; use him for the last-minute and "slot just taken" demos.
- **For the Book ahead demo:** Leen has Room 1 on Mon 12 Oct, 10:00–12:00. Pick **Mon 5 Oct, Weekly, 10:00–12:00** and **Room 1**: it's amber ("4 / 5"), and Your schedule moves Mon 12 Oct to another room.

**The side-by-side story** (also in the demo's header):

1. Confirm Tala's 13:30 on her Today screen → it turns Confirmed at reception (timeline and table).
2. Check someone in (or press +) at reception → the free seats drop on her phone.
3. Answer her report at reception → the alert reaches her phone.

Any 4-digit code passes on R-11; the real code is in the P-03 outbox.

Screen IDs (R-06, S-01…) are hidden by default. Turn on **Show screen IDs** in P-01 to see them under each title and match screens to the spec.

Wi-Fi speed on Today and in the Wi-Fi sheet comes from mocked hourly speed tests (`speed_tests` on the Wi-Fi amenity in `mock-data.json`); the shown result follows the simulated clock.

## Where things live

```
src/
  data/mock-data.json   rooms, zones, hours, renters, bookings, notices, reports, insights history
  i18n/                 en.json, ar.json (Arabic switches the layout to right-to-left)
  store/                one Zustand store: bookings, seats, notices, reports, messages, events + time rules
  lib/                  time helpers, booking/availability logic (incl. repeats), shared hooks
  components/           RoomsCalendar (rooms grid), DayTimeline, Calendar (multi-day picker), MonthGrid, Repeat,
                        Receipt, RoomSheet, FloorPlan, BookingForm, UI primitives
  renter/               R-01 … R-18, Account sheet
  staff/                S-00 … S-06, S-10
  prototype/            P-01 … P-04 drawer, side-by-side demo
```

## Look and feel

iOS idiom on a white page: a bezel-and-Dynamic-Island phone frame on desktop, frosted nav and tab bars, large titles, inset grouped lists and forms, segmented controls, switches, bottom sheets and alerts. The floor plan is drawn as an architectural plan (walls, door swings, windows, furniture; one circle per public seat).

**Time reads like a clock** in every timeline (Rooms today, a room's day, reception's Rooms today): free time is white and time that has already gone sits under a see-through grey cover, edge to edge, so the grid and earlier bookings still show through.

Two deliberate departures from the spec's _Visual design_ section, made on request:

- **Fonts:** the system font (SF Pro on Apple devices), then **Inter** from Google Fonts, then **IBM Plex Sans Arabic** for Arabic — instead of Barlow Semi Condensed.
- **Corners:** iOS radii (12–28 px) instead of 8 px.

The header uses the Technopark Palestine logo (`public/brand/`). Colours come from it: **navy** for actions, selection and your own bookings; **teal** for live status and free seats (and "free at this time" dots); **amber** for "awaiting confirmation"; **red** for alerts and unread badges, and in a soft tint for Cancel and Report a problem. Text is #1D1D1F with #6E6E73 for secondary text (5:1 on white), and cards use a #F5F5F7 fill.

## Choices the spec left open

- **Daily status nudge (S-01):** the "No status posted today" banner clears when staff post a notice ticked _This is today's daily status_ (on by default for the first post of the day). The two seeded morning notices are ad-hoc, so the banner shows at start, as US-6 expects.
- **Time simulator (P-02)** jumps relative to a _target booking_ you pick (defaults to the logged-in persona's next booking, else Leen's), so US-4 works for Leen or Tala. Time only moves forward; use Reset to go back.
- **Booking window:** days can be picked up to 60 days ahead; a repeat's **Until** can run up to 12 months from the first day.
- **Reminder for Book ahead:** there's no Review screen to choose one, so bookings made ahead get a reminder the day before (bookings from Today still choose on Review).
- **No-shows on long bookings:** with a reminder, each session must be confirmed from it or it's released 1 hour before; without one, it's released 15 minutes after the start if nobody checks in.
- **Placeholders to swap:** the Technopark logo (`TechnoparkLogo` in `components/Icon.jsx`) and room photos (`Photo` in `components/ui.jsx`) are drawn stand-ins; room names, counts and hours are placeholders.
