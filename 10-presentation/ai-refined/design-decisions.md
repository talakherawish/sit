# Design decisions: what changed, why, and which principle it follows

Prototype: https://talakherawish.github.io/sit/ (renter app) · https://talakherawish.github.io/sit/s/today (reception dashboard)

Presenting: https://talakherawish.github.io/sit/demo shows the renter phone and the reception dashboard side by side, sharing live data (check someone in on the right, watch the seat count change on the left).

We worked in **Design Thinking loops**: build from the spec, review it as a user, fix, repeat. Each round below lists what changed, the problem behind it, and the UX principle it follows.

---

## Round 1: Build from the spec (Define → Prototype)

| Decision | Why | Principle |
|---|---|---|
| Build a clickable prototype with fake data in the browser, not static screens | Lets people *use* the flow (book, get reminded, check in) instead of imagining it | Prototype → Test; "test instead of assuming" |
| Arabic and English with full right-to-left layout | Technopark renters use both languages | Accessibility; designing for the user's context |
| One booking sheet used by both the map and the list | Same task should work the same way wherever you start | Consistency |

## Round 2: Look and feel

| Decision | Why | Principle |
|---|---|---|
| iPhone-style patterns: large titles, grouped lists, bottom sheets, tab bar | People already know how these work on their phones | **Jakob's Law** |
| White background, one card colour, system fonts | Calm, readable, less "AI-looking" decoration | **Aesthetic-Usability Effect**; clarity > decoration |
| Architectural floor plan (walls, doors, one dot per seat) | Renters recognise the real building, so they find rooms faster | Familiar mental model; context |

## Round 3: First review (Empathize → Define)

| Decision | Why | Principle |
|---|---|---|
| The signed-in user is always **Tala** | The prototype should feel like *your* account | User-centred design |
| Removed the date line and the "R-01" screen codes | Didn't help the user; added noise at the top | Reduce cognitive load; **Miller's Law** |
| Wi-Fi row shows the real speed (↓ 94 · ↑ 41 Mbps) with a speed-test panel | "Wi-Fi back to normal" doesn't tell you if you can take a video call | Useful information over vague status |
| "How do you want to work?" became "What are you here to do?" with a one-line explanation | Users didn't understand what the chips did | Clear labels; feedback |
| Pop-ups became true bottom sheets that cover the screen, drag down to close | They opened off-screen and the page scrolled behind them | **Fitts's Law** (actions near the thumb); feedback; familiar pattern |
| Notifications grouped into "New" and "Earlier", each with an icon and an action | A flat list didn't show what mattered | Visual hierarchy |

## Round 4: Second review

| Decision | Why | Principle |
|---|---|---|
| Technopark Palestine logo; colours taken from it (navy for actions, teal for "free", red only for alerts) | Mixed orange/navy/teal felt disconnected | Consistency; **Von Restorff** (one strong colour for the main action) |
| Hid the reviewer "Prototype" tab (open it by tapping the logo 3×) | It looked like part of the product | Clarity > decoration |
| Room sheet shows the **whole opening day** as a timeline with labelled "Booked 10:00–11:00" blocks | A list of free start times hid *when* the room was taken | Visibility of system status; error prevention |
| Clear time selection: tap to start, tap again to stretch, tap inside to shorten, and a message if a booking is in the way | Picking times sometimes silently reset your choice | Feedback after actions; prevent errors |
| "Book more days" switch in the room sheet with a calendar | Reaching multi-day booking took too many taps | Fewer clicks to the main value ("clicks to treasure") |
| Floor plan no longer zooms; removed −, + and Reset | Extra controls with little benefit | **Hick's Law** (fewer choices) |
| Map key on one line: Free · Booked · Selected · Down | "Matches / selected" was confusing and wrapped onto two lines | Miller's Law; consistency |
| Removed "Rooms today" and "Coming soon" from Home | Crowded, said little | Avoid too much information |
| Home split into clear sections: status → floor plan → "What are you here to do?" (which now lists suitable rooms) | Everything was stacked at the top | Visual hierarchy; chunking |
| My bookings: **Confirm** button next to Change / Cancel, plus sort options | Confirm was missing; newest wasn't on top | Make important actions obvious; user control |
| "List" tab renamed **Rooms** with a one-line explanation | Users didn't know the list was another way to book | Clear navigation |

## Round 5: Reception dashboard matches the app

| Decision | Why | Principle |
|---|---|---|
| Same logo, colours, live seat card and notice rows as the renter app | Staff and renters should see one product | Consistency |
| "Rooms today" timeline for all rooms: bookings coloured by state, a line for "now" | Reception sees the whole day at a glance | Visibility of system status |
| Click a booking to check in; click free time to book for someone (form pre-filled) | Fewer steps for the most common desk tasks | Fewer clicks |
| Sort today's bookings by time, room, renter or status | Different questions at the desk need different orders | User control and freedom |

## Round 6: Checked against the UX resources

| Decision | Why | Principle |
|---|---|---|
| Timeline rows are **44 px** tall (was 30 px); past hours are hidden today | 30 px was below Apple's 44 px minimum tap size, so it was easy to miss | **Fitts's Law**; accessibility |
| **Undo** on the confirmation message after booking or cancelling | A cancel was final; a mistaken booking had to be cancelled by hand | Let users recover from mistakes |
| **Shorter booking**: when you've already picked room and time, the next screen is a one-page review (summary + "What's it for?" + Confirm) | The full form asked again for what you'd already chosen | Clicks to treasure; Hick's Law |
| **Find a room** supports One day, **Weekly** (e.g. every Sun & Tue for 4 weeks), **Monthly** (e.g. the 1st of each month) and **Pick days** (any days, not the same weekday) | Regular renters book patterns, not single days | Understand user needs; flexibility |
| Find a room shows results instantly ("Free on all 7 days" / "Free on 6 of 7") and books straight from the result | The old "Show rooms" button was an extra step | Feedback; fewer clicks |
| Technopark icon when you **add the site to your phone's home screen** (web app manifest + Apple touch icon) | Renters open it like an app | Jakob's Law; mobile context |
| A clear ending: confirmation screen plus "Booked · Undo" | People remember the end of a task most | **Peak-End Rule** |

---

## Round 7: Logic fixes on the reception dashboard

| Decision | Why | Principle |
|---|---|---|
| Check-in only counts a booking when it's due (30 min before start until it ends); earlier arrivals are walk-ins until then, with a "Move to room" button when it comes due | Checking someone in at 09:30 marked their 15:00 booking as already used | Prevent errors; match the real-world process |
| Only walk-ins take a public seat; people with a room booking don't change the open-area count, and a walk-in moving into their room frees their seat | The seat counter went up for people going to private rooms | Accurate system status |
| No check-in when public seating is full (button says so) | The counter silently stopped at 40 | Prevent errors; feedback |
| A person can't be booked into two rooms at the same time; the form warns before you submit and clashing days are skipped | Staff could double-book someone | Error prevention over error messages |
| Clear messages when nothing could be booked, instead of a silent "booked" | Staff thought a booking went through when it didn't | Feedback after every action |
| Reports can tick several issue types (e.g. AC and noise) | Real problems often come together | Match user needs; reduce extra reports |
| Staff and renter tabs share the same live data | A check-in on the dashboard didn't appear in the app | Consistency; visibility of system status |

## Clicks to book (roughly)

| Task | Before | Now |
|---|---|---|
| Book one room, one time | Room → time → Book → choose reason (dropdown) → check end time → Book (about 7–8 taps) | Room → start → end → Book → reason chip → Confirm (about 5–6; 4–5 if you picked an activity first) |
| Book the same time on 3 days | Above + scroll the form to the calendar + tap 2 days | Room → start → end → "Book more days" → tap 2 days → Book → Confirm |
| Find a room every Sunday for a month | Not possible | Find a room → Weekly → pick Sunday → Book |

## What we have *not* done yet (and should)

- **Test with real users.** Every change so far came from our own review. Next step: 5 people (3 renters, 2 reception staff), three tasks each: *find a free room now*, *book the same room on two days*, *cancel one booking*. Watch where they hesitate; count taps; ask what they expected. The Prototype panel's Analytics tab (P-04) already logs some app events.
- **Wireframes** for the report (the `07-wireframes` folder) can be traced from the prototype screens.

## Principles we follow (quick reference)

- **Jakob's Law**: familiar phone patterns (tab bar, bottom sheets, large titles).
- **Fitts's Law**: 44 px tap targets; main actions at the bottom near the thumb.
- **Hick's Law**: fewer controls (no zoom buttons, one-page review).
- **Miller's Law**: information in small groups (status card, sections, one-line key).
- **Von Restorff Effect**: only the main action is filled navy.
- **Peak-End Rule**: clear confirmation with Undo.
- **Aesthetic-Usability Effect**: calm, consistent visuals make it feel easier.
- **Product principles**: feedback after every action, prevent errors, allow recovery, consistency, accessibility (labels, not colour alone; Arabic RTL).
