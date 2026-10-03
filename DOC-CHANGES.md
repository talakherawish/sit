# Documentation changes waiting to be made

A running list of what the documents need after the renter app changes that started on 3 Oct 2026.
**Only the latest version of each item counts.** When something changes again, edit the item here instead of adding a new one. When the prototype is final, this list is what gets pulled into the documents.

Status: **built** = in the code now · **decided** = agreed, not built yet

**As of 3 Oct: everything in section 1b is built** in the renter app (not pushed or deployed yet). Sections 2–7 are document work still to do.

---

## Why these changes happened

- **Diaa's feedback (2 Oct, on the demo links):** in the presentation, explain the user / product journey on top of the demo ("the most important thing"). For the UX: the user should get their value as soon as possible, so check whether the booking landing page does that.
- **What we found:** Home led with building info and hid what the renter needed (their own booking awaiting confirmation was two tabs away). Booking from the Rooms tab took too many taps. The floor plan and "What are you here to do?" were below a blank gap.

---

## 1. Design decisions (inside AI-USAGE-LOG.pdf)

The markdown sources were folded into the PDF in commit `e204140`. To edit, restore them:
`git show e204140~1:10-presentation/manual/design-decisions.md` and `git show e204140~1:10-presentation/ai-refined/design-decisions.md`, add the rounds below, then rebuild the PDF.

### 1a. Manual version: new round, "Round 12: After Diaa's feedback"

**What I said** (word for word, as spoken):

> I don't know where no reminder is needed. It's confirmed straight away. Lives. I've never seen that before. And the little note before book a room should be gone too. What I was thinking, if the homepage is too many flows, I mean, it's important to have 22 seats free as the bigger number. It is more important than 18 out of 40. Let's remember, my vision says no before you go. And this top part is the no before you go. What we could do below it would have to be, for example, today's room schedule. So only the rooms and how they're booked for today. And what are you here to do? I feel like it should go in bookings more.

> I like the whole today thing, one, the homepage, combining everything about today only. And then the rooms and the map. I think it's nice too, but we can't add another tab. I think that's enough. Do you think report and my bookings or my bookings should go somewhere else? Like should report be from the account, for example, like once I access my account, for example, I can't access my account right now, even though I'm clicking on it. Maybe we can have like a red-ish option that says report a problem.

> i think in account there should be a row in opaque red to report a problem and a flag icon and then that flag icon should also exist inside a booking wether confirmed or not in case someone wants to report THAT specifc booking

> i lik ethe full gid like rooms tab because i dont get what  mean by option 1. how would option 1 fit in a mobile screen. also i just tried booking from the rooms tab and it is a long process. a loto f clicking. i think form today we should only bok for today. and then for an actual repeptitive or long time ahead booking we could move to a booking page. maybe my bookings should be called histpry??

> drop todays cedule in rooms tab because it will live in home page, and maybe start with a month calendar to choose from?? or a week scedule once the timing is chosen it gives u the rooms you could book. and te opposite is also true you could ask for the room first then see available dates and hours.

> let's say you have a course every two days a week for a four months, and you want to book a room and you don't want to have to book every single time you go. That's what I mean. That's what I want to get fulfilled. So maybe we can have a month calendar. And you choose, and then you choose how many times you want to repeat it. And don't ask, repeat, yes or no, and then ask again, how many times? Let's just have, like, a um, straightaway option. And minimize the amount of clicking to get past something.

> 4 month sis a lot make it just these days 2 weeks month and until anything

**Why I asked for this / Principle I was following:** for you to fill in.

### 1b. AI-refined version: new round, "Round 12: Value first (after senior PM feedback)"

| Decision | Why | Principle |
|---|---|---|
| Three tabs: **Today · Book ahead · My bookings** (was Map · Rooms · My bookings · Report) | Each tab answers one question: what's happening today, when can I book later, what have I booked. Matches the vision: *know before you go* (Today) and *sit where you booked* (My bookings) | Clear navigation; Hick's Law |
| **Today** holds everything about today only: your bookings today, live seats, hours, cafeteria, Wi-Fi, notices, then every room's day | The first screen should answer "can I come in and work?" without scrolling past a gap | Visibility of system status; clicks to treasure |
| **"22 seats free"** is the big number; "18 of 40 taken" is small | People ask "is there space for me?", not "how full is it?" | Visual hierarchy |
| **Your booking today** sits at the top of Today, with **Confirm** right there when it's waiting | Confirming is what keeps your room; it used to be two tabs away | Make important actions obvious |
| Removed the **Book a room** button, its "No map needed" note and the blank gap from Home | The rooms grid on Today *is* the booking surface now | Minimalist design |
| Today's rooms show as the **full grid** (one column per room), starting at the current hour | You tap the exact free time you want: one step fewer than picking a room, then a time | Fitts's Law; clicks to treasure |
| From Today you book **today only**: tap a free time → Review → Confirm | The quick, common case gets the shortest path | Clicks to treasure |
| In the grid and timelines, **your own bookings are navy**; teal now only means free | "Yours" was teal too, so it looked free | Consistency; clear signals |
| **Book ahead** has two ways in: **By time** (pick days and time, see which rooms are free) and **By room** (pick a room on the map, see its free days and hours) | Some people start from their schedule, others from a favourite room | Flexibility; user control |
| Book ahead uses a **month calendar**; tap several days at once | A course on Mon and Wed is two taps, not two bookings | Fewer clicks |
| **Repeat** is chosen straight away from chips: Just these days · 2 weeks · 1 month · Until… (no "Repeat? yes/no" step) | One tap instead of a switch plus a second question | Hick's Law; clicks to treasure |
| Rooms show **"free all 32 times"** or **"free 29 of 32"** before you pick one | A room free on day 1 can be taken in week 9; you see it before booking, not after | Error prevention |
| **One list of activities** ("What are you here to do?") used to filter rooms and as the booking's reason; labels shortened to Focused work · Call · Group work · Meeting · Interview · Other | Home and the booking form used to ask the same thing with two different lists | Consistency |
| In Book ahead the **map is plain**: no live free/booked colours, each room shows its size, and rooms that don't suit the activity are dimmed | Live "free now" colours are misleading when you're planning next week | Relevance; error prevention |
| The booking reason is **optional** | It helps Technopark, not the renter, and blocked the Confirm button | Remove friction; user control |
| **Free time is teal everywhere** (map, grid, timelines) | "Free" was teal on the map but white in the grid | Consistency |
| Reminder text for bookings that start within 2 hours: "Starts within 2 hours, so it's confirmed now", and the "released 1 hour before" line is hidden | The two lines contradicted each other | Clear, honest feedback |
| Tapping the **avatar opens Account**: name, language, My reports, **Report a problem** (soft red, flag), Log out | The avatar looked tappable but did nothing | Affordance; Jakob's Law |
| **Report a problem on a booking** appears once the booking has started (in place of Change / Cancel) and on past visits; it fills in the room and time | Problems happen while you're in the room; reception should know exactly which booking | Context; error prevention |
| My bookings: "Used" → **"Checked in · until 10:00"**; a repeating booking counts once; Change / Cancel are hidden once a booking starts instead of greyed out | Clearer status; the count was inflated (21); disabled buttons are noise | Clarity; minimalist design |
| Kept the name **My bookings** (not "History") | Most of what's there is upcoming bookings you act on; "History" sounds like past only | Clear labels |
| "Report an issue" is now **"Report a problem"** everywhere | One name for one action | Consistency |
| Long repeating bookings show a summary on Review ("34 dates · Mon 5 Oct – Wed 27 Jan") with the first few dates and "+30 more" | A list of 34 date chips was a wall | Miller's Law; chunking |

### 1c. Earlier decisions this round overrides

Keep the old rounds (they're a history), but the reader should know these changed:
- Round 4: "Removed Rooms today from Home" → today's rooms are back, as the grid.
- Round 4: "Book more days switch in the room sheet" → replaced by repeat chips (no switch).
- Round 4 / 8: Home's floor plan and "What are you here to do?" → moved to Book ahead.
- Round 8: "Book a room button at the bottom of the first screen" → removed.
- Round 9: "List view is kept one tap away" → List view removed; Book ahead has By time / By room.
- Round 10: "Report is the fourth tab again" → Report moved into Account and onto bookings.

### 1d. "Clicks to book" table

Counted on the built prototype (3 Oct):

| Task | Before | Now |
|---|---|---|
| Book a room today | Book a room → tap free time → sheet: Book → reason (required) → Confirm (5 taps) | Tap a free time on Today → Confirm (2 taps) |
| A course twice a week until a date (34 sessions) | Not possible in one go | Book ahead → tap Mon → tap Wed → Until… + date → start time → length → tap room → Confirm (about 8) |
| Same, starting from a room | Room → Book more days switch → calendar → days → time → Book → reason → Confirm | Book ahead → By room → tap room on map → tap day → tap start and end time → repeat chip → Book → Confirm (about 8) |

---

### 1e. Rules worth saying out loud in the presentation

- **No-shows don't block rooms, even on long repeating bookings:** with a reminder, each session must be confirmed from it or it's released 1 hour before; without a reminder, it's released 15 minutes after the start if nobody checks in. This is the answer to "can one person hold a room all semester?"
- **Limits:** the calendar lets you pick days up to 60 days ahead; "Until…" can run up to 12 months from the first day. (Change these if you decide differently.)

---

## 2. Prototype README (`prototype/README.md`)

- Live links: `/r/home` is now **Today**; `/r/list` is now **Book ahead**.
- Surfaces / screen list: tabs are Today · Book ahead · My bookings; Report (R-16) and My reports (R-17) are reached from Account; new Account sheet.
- "Booking a room" paragraph: rewrite for Today (grid → Review) and Book ahead (By time / By room, month calendar, repeat chips).
- "Features planned for later sprints": **repeat bookings** and a small part of **profile** (the Account sheet) are now in this build.
- Demo start state: Tala's Today shows her checked-in Focus Room 1 booking and the 13:30 call waiting for confirmation.

---

## 3. Backlog, sprint plan and roadmap (not in this repo: 04-backlog, 06-sprint-plan, 09-roadmap)

- **Repeat bookings** move from a later sprint into this one. Reason: a real persona need (a course twice a week for months).
- **Account sheet** (name, language, My reports, Report a problem, Log out) pulls a small part of Profile forward. Birthday, contact preference and booking history stay in the later sprint.
- **Booking reason** becomes optional.
- Capacity: if repeat bookings join this sprint, say what moves out or how the estimate changes.

## 4. User stories (not in this repo: 05-user-stories)

- Check the acceptance criteria of the booking, report and My bookings stories against the new flows (Today booking, Book ahead, report from a booking, reason optional).

## 5. Success metrics (not in this repo: 08-metrics)

- If any metric uses the booking reason (purpose mix), note that it's now optional, so the data covers only people who pick one.
- Possible new measure for Diaa's point: **time / taps from opening the app to a confirmed booking**.

## 6. Wireframes (07-wireframes)

- **No change to the document.** In the presentation: "I built the wireframes first, then changed the design after feedback and testing, so the prototype looks different." A before/after slide supports this.

## 7. Presentation

- Narrate the journey on top of the demo (Diaa's main point): persona → moment → screens → outcome → metric.
- Before/after slide for Today (old Home vs new Today) as evidence of iteration.

## 8. Code still to sync later (not documents)

- Staff dashboard: "—" when a booking has no reason (**done**, so nothing breaks). Still to do: show which booking a report is about (reports now carry `booking_id`); names cut off in the Rooms today timeline.
- Side-by-side demo: loads the renter app, so it updates by itself; re-run the demo story.
- Wireframes stay as they are.
