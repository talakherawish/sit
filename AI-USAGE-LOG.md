# AI Usage Log

For each deliverable: manual version → AI tool + prompt → refined version → what changed and why I kept or rejected it.

| # | Deliverable | Manual version | AI tool | Prompt(s) | Refined version | What changed / what I rejected |
|---|-------------|----------------|---------|-----------|-----------------|--------------------------------|
| 1 | Vision & statement | 01-vision/manual/ | | | 01-vision/ai-refined/ | |
| 2 | Research & competitive analysis | 02-research/manual/ | | | 02-research/ai-refined/ | |
| 3 | Personas | 03-personas/manual/ | | | 03-personas/ai-refined/ | |
| 4 | Prioritized backlog | 04-backlog/manual/ | | | 04-backlog/ai-refined/ | |
| 5 | User stories (5–8) | 05-user-stories/manual/ | | | 05-user-stories/ai-refined/ | |
| 6 | Sprint plan | 06-sprint-plan/manual/ | | | 06-sprint-plan/ai-refined/ | |
| 7 | Wireframes | My own review notes on the clickable prototype ([10-presentation/manual/design-decisions.md](10-presentation/manual/design-decisions.md)). No separate hand sketches. | Claude Code (Claude Opus 5.5) | 7 prompts, word for word in [7. Wireframes](#7-wireframes) below | [07-wireframes/ai-refined/wireframes.html](07-wireframes/ai-refined/wireframes.html) (live: https://talakherawish.github.io/sit/wireframes/) and [screens/](07-wireframes/ai-refined/screens/) (27 PNGs) | Five versions in one day. Kept: low-fi frames traced from the prototype, tap counts, notes tied to UX laws, one flow per page. Rejected: short notes, the by-date booking form, the "Every screen" page. Details below. |
| 8 | Metrics & KPIs | 08-metrics/manual/ | | | 08-metrics/ai-refined/ | |
| 9 | Roadmap | 09-roadmap/manual/ | | | 09-roadmap/ai-refined/ | |
| 10 | Presentation | 10-presentation/manual/ | | | 10-presentation/ai-refined/ | |

## 7. Wireframes

**Starting point.** I didn't sketch the wireframes by hand. The manual input was my own review of the clickable prototype, round by round ([10-presentation/manual/design-decisions.md](10-presentation/manual/design-decisions.md)), and the UX resources summary from the self-study material. The AI traced the wireframes from the prototype and applied the resources' advice on wireframing.

**Tool.** Claude Code (Claude Opus 5.5), working in this repo. It read the prototype's code and screens, wrote the page, rendered the screen images and pushed to GitHub Pages.

**Prompts** (word for word, except 3)

1. "create wireframes for the demo we just built following resources advice on wireframes" (with the UX resources summary pasted in)
2. "do u think we should add this to the repo and have it deployed with therest?", then "do it and push"
3. In another chat, after the Next/Later features were cut from the prototype, the wireframes were matched to it and the notes shortened (that prompt isn't recorded here)
4. Asked whether to bring the notes back: "Bring them back"; then "update the wireframes accordingly and send themto me as screenshots or pictures of the screens only"
5. "also make the wirefraes html page more interesting to read and keep reading because it is a but annoyingly long"
6. "add notifications back so renters get alerted also add u in code and in the side by side demo and in every copy"
7. "remove the screens section https://talakherawish.github.io/sit/wireframes/#screens its fugly and unnecessary only keep necessary stuff"

**Versions, and what I kept or rejected**

| Version | What the AI produced or changed | What I kept, rejected or asked for, and why |
|---|---|---|
| 1 | One long page: greyscale low-fi frames for 6 flows (25 frames) traced from the prototype, taps counted on every arrow, pink pins with notes naming the UX law, a key, a navigation map, a principles index and a test plan. Published at /wireframes/. | Kept the approach: structure only, no colour or branding, so the review stays on "does the flow work?" (the resources' definition of a wireframe). Kept the tap counts ("clicks to treasure"). |
| 2 | (Another chat) Matched to a trimmed prototype: dropped login, reports, notifications and the by-date booking form; added the Rooms tab day view; shortened the notes to one line. | Rejected the short notes: they were what tied each choice to the UX resources. Reporting and notifications had been removed by mistake, so I had them restored in the app. The by-date form stayed out because it's gone from the prototype. |
| 3 | Report flow back (renter form, My reports, the staff inbox, the reply reaching the renter). Full notes back. The page became one flow at a time: overview cards with tap counts, a sticky bar of flows, Next/Back, arrow keys, and pins that highlight their note. Every screen exported as its own PNG. | Asked for the paged layout because the long page was tiring to read. Asked for the PNGs so the screens can go on slides without page text. |
| 4 | Alerts: a bell with an unread dot on every renter screen, an alert banner, and Notifications (R-18) in Flow 6. Added to the app and the side-by-side demo too. | Asked for it: without alerts, a renter only saw a reply to their report if they happened to open My reports. |
| 5 | Removed the "Every screen" page (the tab and sidebar map). | Rejected it: it looked messy and the flows already show every screen. |

