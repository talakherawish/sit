# Documentation changes waiting to be made

A running list of what the documents need after the renter app changes that started on 3 Oct 2026.
**Only the latest version of each item counts.** When something changes again, edit the item here instead of adding a new one. When the prototype is final, this list is what gets pulled into the documents.

Status: **built** = in the code now · **decided** = agreed, not built yet

**As of 3 Oct: everything in section 1b is built**: the renter app, the reception dashboard and the demo. Sections 2–7 are document work still to do.

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

> my bookings should have the option to toggle beltween my bookings as cards and as calendar.
> in home page your bookings today should only the show the most close upcoming booking with confirm cancel buttons only ONE and it should b below wifi and seats free and above rooms today. roms today should flip colors in time so what didnt happen yet so from 9:30 onward it should be free remove the greenish color and the time before that passed should be entrely covered in opaque grey do not leave the edges.
> what are u here to do gets asked multiple times when booking.

> i am thinking of changing the book ahead to feel mre like a form filling, so no by time or by room just one continuous form, starting with days in the calendar then time from to without the min options. lets prompt this first
> so first is remov ethe pick days and a time, then a room thats free subtitle. first below book ahead is the calendar then repeat section with option weekly monthly and util all in the same row. if none chosen it means no repeat. u can click and unclick. then time picker with options all in the same row too then the floor map with highligted rooms that align with previous booking specifications the rest is faded. u pick a room and lastly the what are u here to do today and a confirm booking button. there are options to see a specific rooms availablity by clicking on the room a page with the rooms images name and calendar availability show all for thet room only. then if i choose a date i can see that specific days bookings. is that clear?

> sync the book ahead form to the staff dashboard

> Also, in the today section, uh, when we go down to rooms today, I want to be able to tap the calendar like not the calendar the free time slot and select it it should highlight in deep blue the way it did before because for now it says review booking when you tap So I want to choose the time, once the time is chosen, the what's it for and reminder should appear like they shouldn't be there already. If you choose a time frame in today's room schedule, then confirm booking and the fact that it says starts within two hours, so it's confirmed now. In case that's the case, and just remove what's it for. Because it's like a quick um, booking. For today. They should appear. What I don't like. Is just having. Um, a lot of. Pages opening and closing. So. Let's keep it that way. And. The grade area above. Uh, the time that has passed. Should be more opaque. So it shouldn't just be gray. Fully. You can still see the grid and everything. But there's. An opaque gray cover. Transparent. Ish. And rename big room one and big room two. To room one and room two. Without the big.

> Starting from the today, Section. In the rooms today section, remove the little squares saying free booked yours passed down. I think it's pretty intuitive. And clicking on a time, shouldn't automatically like surprise you. with a notification. Because it covers the rest of the schedule and you can't pick the rest of the times you want. So have it just draggable from the bottom up. So when someone clicks on the schedule, a little Confirm booking shows from the very bottom. Behind the footer today book ahead and my bookings. And you can drag it up or down. If you drag it up, it's going to show the hours, the room, you know, the receipt kind of. And if you drag it down, you're simply still choosing. You can also click the same time you picked to cancel that booking and that option disappears. There's that extra space below that says Technopark Palestine, I want that gone. Make the event in the main hall notice be the one that shows in the user's today page. Your next booking should be this designed in a smaller way. I think. Just like a quick confirming cancel. Since the main thing about this app is booking, there isn't also a book button. So what we're going to do is under the notice, it's just one notice, that shows in the today page. Under the notice, there's going to be a confirm your booking. In a small way, kind of the same height as the as the notices. And then Below that, we could add like a book button. If you think that's good. I'm just trying to elevate the UI because my senior product manager obviously showed that he didn't like it much.

> Also clicking on, for example, focus room three in the today part should also show the images of that room, just like the details of the room, but specifically for today. And obviously, some sort of option to see the calendar of that room. So when room details or like a room name is clicked in the Today app, in the Today, I mean, page, it should show today's schedule of that room. And in a really subtle way, be able to expand into the calendar if you want to see some other available dates specifically for that room. And do not ever forget the images. Also, let's populate the images as well.

Answers to the follow-up questions: repeat = "Weekly/Monthly + Until date"; room page = "room details"; Review = "skip it and show a receipt of the booking make it from the bottom make the motion of the receipt upwards and leave out of the top of the screen."; partly free rooms = "rooms available on some days shuldshow differently like partially available. or a combination of rooms that make thebooking work highliht in the same color".

**Why I asked for this / Principle I was following:** for you to fill in.

### 1b. AI-refined version: new round, "Round 12: Value first (after senior PM feedback)"

| Decision | Why | Principle |
|---|---|---|
| Three tabs: **Today · Book ahead · My bookings** (was Map · Rooms · My bookings · Report) | Each tab answers one question: what's happening today, when can I book later, what have I booked. Matches the vision: *know before you go* (Today) and *sit where you booked* (My bookings) | Clear navigation; Hick's Law |
| **Today** holds everything about today only: live seats, hours, cafeteria and Wi-Fi first, then **one notice**, your next booking and a **Book a room** button, then every room's day. The "Technopark · Palestine" line and the space under it are gone | The first screen should answer "can I come in and work?" without scrolling past a gap | Visibility of system status; clicks to treasure |
| Today shows **one notice**: an event comes first (e.g. "Event in the main hall 10:00–14:00, expect noise"), otherwise the latest; tap it for the rest | An event changes how your day goes; a count of notices doesn't | Visual hierarchy; minimalist design |
| **"22 seats free"** is the big number; "18 of 40 taken" is small | People ask "is there space for me?", not "how full is it?" | Visual hierarchy |
| **Your next booking** (only one: the closest today that hasn't started) is **one small row the height of the notice**, right under it: "Focus 3 · 13:30–15:00" with **Confirm** (when it's waiting) and **Cancel** pills | Confirming is what keeps your room; it used to be two tabs away. A small row, not a card, keeps Today short; the rest are on My bookings | Make important actions obvious; Miller's Law |
| **Book a room** button under your next booking, showing the soonest free time ("Next free 09:30"). Tapping it picks that hour in the first free room and scrolls to the grid with Confirm booking ready; tap another time to change it. Hidden when nothing is free today. The "No map needed" note stays gone | Booking is the app's main job, so it needs a clear button; picking the soonest time for you makes it a 2-tap booking | Make important actions obvious; clicks to treasure |
| Today's rooms show as the **full grid** (one column per room), starting at the current hour | You tap the exact free time you want: one step fewer than picking a room, then a time | Fitts's Law; clicks to treasure |
| From Today you book **today only, without leaving the page**: tap a free time (it turns deep blue; tap another time in the same room to stretch it; **tap the picked time again to drop it**). A small **Confirm booking** bar slides out from behind the tab bar with the room and time. **Drag it up** (or tap it) for the receipt: room, day, time, length and reminder (or "Starts within 2 hours, so it's confirmed now"); drag it down to keep choosing. No "What's it for?" | The old panel popped up over the grid and hid the times you might still want; the bar stays out of the way until you want the details | Clicks to treasure; user control; minimalist design |
| **No colour key** above Rooms today (free · booked · yours · past · down) | The grid reads on its own: white is free, grey blocks are taken, "Yours" is labelled, the past is greyed | Minimalist design; recognition over recall |
| Tapping a **room name** (or someone's booking) on Today opens the room: **photos**, size and features, then **today's schedule** to pick a time; Book hands it to the Confirm booking bar. A quiet **"Other days"** link opens the room's month calendar in place; pick a day and Book carries the room, day and time into Book ahead | People choose rooms by looking at them; today stays the focus, other days are one tap away without leaving | Recognition over recall; progressive disclosure |
| **Room photos** are now drawn from each room (its table and seats, screen, whiteboard, window) in three views: from the door, from above, and a close-up. Placeholders until real Technopark photos are added | The flat colour blocks didn't tell rooms apart | Recognition over recall |
| In the grid and timelines, **your own bookings are navy** | "Yours" was teal, the same as the map's "free" | Clear signals |
| **Book ahead is one form**, top to bottom: days → repeat → from / to → room on the map → what you're here to do → Confirm (no "By time / By room" switch, no subtitle) | Feels like filling in a form: one path, every choice in sight, nothing to choose between first | Hick's Law; recognition over recall |
| Days on a **month calendar**; tap several days at once | A course on Mon and Wed is two taps, not two bookings | Fewer clicks |
| **Repeat** in one row: **Weekly · Monthly · Until <date>**; tap to pick, tap again to unpick, nothing picked = no repeat. Picking one fills in Until (a month for weekly, six months for monthly) | No "Repeat? yes/no" step, and never open-ended | Clicks to treasure; error prevention |
| **Time** is From and To side by side (the 30 min / 1 h / 2 h length buttons are gone) | People think in start and end times | Match the real world |
| On the **map**, rooms free on every date are highlighted, rooms free on only some are amber with "29 / 34" (the rest are skipped), others faded | A room free on day 1 can be taken in week 9; you see it before booking, not after | Error prevention; visibility of system status |
| If no single room works, a **combination of rooms** that together cover every date is highlighted in the same colour, with "Use these rooms" | A course shouldn't fail because no one room is free every time | Flexibility; error prevention |
| The picked room's card has **Room details**: photos, size, features and the room's own month calendar of availability; tap a day to see its bookings | Some people choose a room by looking at it and its week | Recognition over recall |
| **No Review screen in Book ahead:** Confirm books it and a **receipt** rises from the bottom, holds, then leaves off the top; "Booked · Undo" follows. Reminder: the day before each booking | One less screen; the receipt is the clear ending | Peak-End Rule; clicks to treasure |
| **One list of activities** ("What are you here to do?") used to filter rooms and as the booking's reason; labels shortened to Focused work · Call · Group work · Meeting · Interview · Other | Home and the booking form used to ask the same thing with two different lists | Consistency |
| **Asked once:** if you picked an activity in Book ahead, Review shows it ("What's it for? Group work · Edit") instead of asking again | It was asked twice in one booking | Don't make people repeat themselves |
| The booking reason is **optional** | It helps Technopark, not the renter, and blocked the Confirm button | Remove friction; user control |
| **Time reads like a clock:** free time is white; time that has already gone sits under a **see-through grey cover, edge to edge**, so the grid and earlier bookings still show (Rooms today, a room's day and reception's timeline) | The green tint on free time made the grid look busy; a solid grey hid what had happened | Visibility of system status; clarity |
| **Big Room 1 / 2 → Room 1 / 2** (the zone is "Rooms") | Shorter names that fit the grid columns | Clarity |
| **Reception: Book for someone (S-07)** is the renter's Book ahead form at the desk: pick the renter (search or add new), then the same steps in two columns, "See availability" for any room, **Book for <name>**; the renter gets an SMS and an alert | Reception books for walk-ins and phone calls with the same rules renters see | Consistency; one booking logic |
| Reminder text for bookings that start within 2 hours: "Starts within 2 hours, so it's confirmed now", and the "released 1 hour before" line is hidden | The two lines contradicted each other | Clear, honest feedback |
| Tapping the **avatar opens Account**: name, language, My reports, **Report a problem** (soft red, flag), Log out | The avatar looked tappable but did nothing | Affordance; Jakob's Law |
| **Report a problem on a booking** appears once the booking has started (in place of Change / Cancel) and on past visits; it fills in the room and time | Problems happen while you're in the room; reception should know exactly which booking | Context; error prevention |
| My bookings: "Used" → **"Checked in · until 10:00"**; a repeating booking counts once; Change / Cancel are hidden once a booking starts instead of greyed out | Clearer status; the count was inflated (21); disabled buttons are noise | Clarity; minimalist design |
| Kept the name **My bookings** (not "History") | Most of what's there is upcoming bookings you act on; "History" sounds like past only | Clear labels |
| **My bookings: Cards ⇄ Calendar** switch beside the title. Calendar is a month view with a dot per booking (amber = waiting for you, navy = confirmed or used, grey = cancelled or released); tap a day to see its bookings as cards | A repeating course is easier to read on a calendar than as a list | Flexibility; recognition over recall |
| "Report an issue" is now **"Report a problem"** everywhere | One name for one action | Consistency |
| Long repeating bookings show a summary ("34 dates · Mon 5 Oct – Wed 27 Jan") on the receipt and on Review | A list of 34 date chips was a wall | Miller's Law; chunking |
| **Reception:** the seat card adds "22 seats free" in teal under the count (the count still goes up with + because reception counts people in); the top bar leads with "22 seats free · 18 / 40" | Reception and renters read the same number | Consistency |
| **Reception's Rooms today:** same time rules as the renter grid (free white, past solid grey); checked in is solid navy (was teal), confirmed light navy, awaiting amber | One colour language across both screens | Consistency |
| **Reception's Rooms today:** labels fit the space: long bookings show name and times, short ones the name and start, very short ones just the name; hour labels thin out on small screens | Names were cut off ("Fa…"), especially in the demo | Legibility |
| **Reception's bookings table** shows Awaiting confirmation / Confirmed instead of "Upcoming"; repeating bookings get a repeat mark | When a renter confirms from Today, the desk sees it straight away | Visibility of system status |
| **Reports inbox** shows which booking a report is about ("Booking · Thu 1 Oct · 09:00–10:00") | Reports sent from a booking carry it; staff shouldn't have to ask | Context; fewer steps |
| **People:** a repeating booking counts once in "Upcoming" | Same rule as My bookings (Tala showed 37 upcoming) | Consistency |
| **Demo** header describes the new journey: confirm Tala's 13:30 on Today and watch reception change; check someone in and watch free seats drop on her phone; answer her report and the alert reaches her | The presentation should narrate a journey (Diaa's main point) | Storytelling |

### 1c. Earlier decisions this round overrides

Keep the old rounds (they're a history), but the reader should know these changed:
- Round 4: "Removed Rooms today from Home" → today's rooms are back, as the grid.
- Round 4: "Book more days switch in the room sheet" → replaced by repeat chips (no switch).
- Round 4 / 8: Home's floor plan and "What are you here to do?" → moved to Book ahead.
- Round 8: "Book a room button at the bottom of the first screen" → it's back as a button under your next booking that picks the soonest free time (it was briefly removed earlier this round).
- (This round, earlier version) The panel that rose over the grid when you picked a time on Today → replaced by the Confirm booking bar you drag up from behind the tab bar. Tapping inside a picked time no longer shortens it; it drops it.
- Round 9: "List view is kept one tap away" → List view removed; Book ahead is one form.
- (This round, earlier version) Book ahead "By time / By room" and the "Just these days · 2 weeks · 1 month · Until…" chips → replaced by the one form and Weekly · Monthly · Until.
- Round 10: "Report is the fourth tab again" → Report moved into Account and onto bookings.

### 1d. "Clicks to book" table

Counted on the built prototype (3 Oct):

| Task | Before | Now |
|---|---|---|
| Book a room today | Book a room → tap free time → sheet: Book → reason (required) → Confirm (5 taps) | Tap a free time on Today → Confirm booking (2 taps, same page), or Book a room → Confirm booking for the soonest free time (2 taps) |
| A course twice a week until a date | Not possible in one go | Book ahead → tap Mon → tap Wed → Weekly (Until filled in; change it if needed) → From → To → tap room → Confirm (about 8, no Review screen) |

---

### 1e. Rules worth saying out loud in the presentation

- **No-shows don't block rooms, even on long repeating bookings:** with a reminder, each session must be confirmed from it or it's released 1 hour before; without a reminder, it's released 15 minutes after the start if nobody checks in. This is the answer to "can one person hold a room all semester?"
- **Limits:** the calendar lets you pick days up to 60 days ahead; "Until…" can run up to 12 months from the first day. (Change these if you decide differently.)

---

## 2. Prototype README (`prototype/README.md`)

**Done (3 Oct):** rewritten for the current build: tabs, a Renter app and a Staff dashboard section, the side-by-side story, "time reads like a clock", the colour key, booking window and no-show rules. Update its Book ahead bullet again if the Book ahead form redesign goes ahead.

---

## 3. Backlog, sprint plan and roadmap (not in this repo: 04-backlog, 06-sprint-plan, 09-roadmap)

- **Repeat bookings** move from a later sprint into this one. Reason: a real persona need (a course twice a week for months).
- **Account sheet** (name, language, My reports, Report a problem, Log out) pulls a small part of Profile forward. Birthday, contact preference and booking history stay in the later sprint.
- **Booking reason** becomes optional.
- **Book for someone** (reception) moves from a later sprint into this one: it reuses the Book ahead form, so the extra work is the renter picker.
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

## 8. Code sync (not documents)

- **Done:** reception dashboard and demo are synced (see the reception rows in 1b).
- Prototype README: **done** (see section 2).
- Wireframes stay as they are.
