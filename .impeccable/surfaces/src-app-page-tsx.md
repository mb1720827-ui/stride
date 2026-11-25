---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/plans/page.tsx","src/app/plans/[id]/page.tsx","src/app/requests/[id]/page.tsx","src/app/review/page.tsx","src/app/settings/page.tsx","src/app/login/page.tsx"]
---

# Stride app surfaces (Today, Plans, plan detail, draft preview, Review, Settings, login)

Mode: Operate. Mobile-first (Android phone, quick check-ins, morning and evening, often from a notification). Code-led.

Audience and job: the owner, a university student in Nigeria, sees what's next, taps Done or Skip, types new goals, and checks progress. Constraints: green stays the main colour; keep the name and the S icon; must not feel childish, dark or techy, cold or corporate, or busy.

## Direction contract

THESIS: The day is a route. Every task step, habit and study session is a stop on one green line, and the screen always says where you are and what's next. Refuses the category default of a checkbox list in white cards.

OWN-WORLD: Lagos route-line material. Cool green-tinted ground #F3F6F1, deep green ink #12261C, Stride green #0E8A4F carries the header band, route line, primary buttons and filled stops; pale track #DCEFE3; danfo yellow #F2C230 only for "you are here" and the current time. Overpass (signage lineage) for everything, heavy tabular time numerals. Flat colour, no gradients or glows. State is a mark on the stop: filled (done), crossed (skipped), hollow red ring (missed), ring (planned); stop size follows a fixed length ramp. Plans as lines too: a task is a line to its deadline terminus, a skill a line of milestone stations grouped by stage, a habit a loop of daily stops.

STORY: Open the app, read the header ("Now 13:05 · Next 18:00"), see the next stop with Done and Skip under the thumb, glance back at the filled stops behind you, and add something new from the + in the tab bar. Missed stops just get moved along; nothing scolds.

FIRST VIEWPORT: Phone 390x844. Green header band: Stride wordmark, day name large, guide words (Now in a yellow chip, Next time), "3 of 6 done today". Below on the tinted ground, today's route down a 4px green line at the left: time numerals right-aligned in a 46px column, stop markers on the line, title and one meta line. Past stops filled or crossed and the line solid; ahead the line is dashed. A yellow "You are here" marker sits at the current time. The next stop is the one card: white with a green border, "Next stop" label, larger title, and full-width Done plus a smaller Skip. Bottom tab bar: Today, Plans, a raised green + (new plan: chat box and Quick add), Review, Settings. Desktop: the same column, centred, max 560px, tab bar becomes a top bar.

FORM: Route Line, candidate 7 of 7 on the grounded list (assigned by the roll), raised by six declined challengers: fixed length ramp for stop size (star atlas), flat colour only (guide map), guide words in the header (lexicon), destructive actions set apart (developer console), state as a mark, not a badge (convention catalog), hierarchy by scale with one large time numeral per stop (type specimen). seed:d9117016de574696

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
