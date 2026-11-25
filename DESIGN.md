---
name: Stride
description: The day drawn as one green route; every task step, habit and study session is a stop on the line.
colors:
  brand: "#0b7a45"
  brand-deep: "#08603a"
  track: "#dcefe3"
  track-hover: "#cbe6d5"
  on-brand: "#e3f5eb"
  here: "#f2c230"
  risk: "#b42318"
  risk-soft: "#fbe9e7"
  ink: "#12261c"
  muted: "#4b6457"
  ground: "#f3f6f1"
  surface: "#ffffff"
  rule: "#d5e0d9"
  skip: "#6f8a7c"
  field: "#7f9688"
typography:
  display:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2rem"
    fontWeight: 800
    lineHeight: 1.05
    letterSpacing: "-0.02em"
  headline:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 800
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 800
    lineHeight: 1.5556
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-semibold:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 600
    lineHeight: 1.375
  body-strong:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1.5
  numeral:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 800
    lineHeight: 1.5
    fontFeature: '"tnum"'
  label:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4286
  caption:
    fontFamily: "Overpass, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  md: "6px"
  lg: "8px"
  xl: "12px"
  2xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
  time-column: "52px"
  rail-column: "40px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.xl}"
    padding: "12px 20px"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
  button-secondary:
    backgroundColor: "{colors.track}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.xl}"
    padding: "10px 16px"
  button-secondary-hover:
    backgroundColor: "{colors.track-hover}"
  button-quiet:
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.lg}"
    padding: "6px 8px"
  button-quiet-hover:
    backgroundColor: "{colors.track}"
    textColor: "{colors.ink}"
  button-done-circle:
    textColor: "{colors.brand}"
    rounded: "{rounded.full}"
    size: "44px"
  button-done-circle-hover:
    backgroundColor: "{colors.track}"
  button-new-plan:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
    size: "56px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.xl}"
    padding: "12px 14px"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  card-next-stop:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    typography: "{typography.headline}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  panel-risk:
    backgroundColor: "{colors.risk-soft}"
    textColor: "{colors.ink}"
    rounded: "{rounded.2xl}"
    padding: "16px"
  chip-now:
    backgroundColor: "{colors.here}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "2px 6px"
  chip-prompt:
    backgroundColor: "{colors.track}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "6px 12px"
  marker-planned:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
  marker-done:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    rounded: "{rounded.full}"
  marker-skipped:
    backgroundColor: "{colors.ground}"
    textColor: "{colors.skip}"
    rounded: "{rounded.full}"
  marker-missed:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.full}"
  marker-now:
    backgroundColor: "{colors.here}"
    rounded: "{rounded.full}"
    size: "24px"
  marker-terminus:
    backgroundColor: "{colors.brand}"
    rounded: "{rounded.md}"
    size: "24px"
  header-band:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.surface}"
    typography: "{typography.display}"
    padding: "20px 20px 24px"
  tab-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.muted}"
  tab-active:
    textColor: "{colors.brand}"
---

# Design System: Stride

## Overview

**Creative North Star: "The Route Line"**

Stride draws the day as a route. Every task step, habit session and study block is a stop on one 4px green line that runs down the left of the screen: solid behind you, dashed ahead, with a yellow "you are here" stop at the current time. The screen always answers two questions at a glance: where am I, and what is next. Plans use the same grammar. A task is a line ending at its deadline terminus, a skill is a line of milestone stations grouped by stage, and a habit is a loop of daily stops. The system refuses the category default of a checkbox list in white cards.

The material is Lagos route-line signage: a cool green-tinted ground, deep green ink, one Stride green that carries the header band, the line, primary buttons and finished stops, and danfo yellow kept for the present moment. Overpass, a typeface with road-sign lineage, sets everything, with heavy tabular numerals for times. Colour is flat. Depth comes from the green band over the tinted ground and from white panels resting on it, never from shadows.

Density is calm and thumb-first. Visits last seconds, so hierarchy comes from scale and weight rather than labels: one large day name, one large next-stop title, everything else quiet. State is a mark on the stop, not a badge beside it. Missed stops get a red ring and a plain "Missed" note, and nothing scolds. Motion is spare: one authored route-draw when Today opens, and immediate answers to every touch.

**Key Characteristics:**
- One green route per screen; stops carry state as marks (filled, crossed, red ring, green ring).
- Yellow means now: the current time, today, the stop in progress.
- Flat colour on a green-tinted ground; white panels; no shadows.
- Overpass at three weights; tabular times; tracking only ever tightens.
- Single centred column, bottom tab bar on phones, top bar on desktop.
- Spare motion that always gives way to reduced-motion preferences.

## Colors

A single deep green does the work, set on a cool green-tinted ground, with one yellow for the present and one red for trouble.

### Primary
- **Route Green** (#0b7a45): the header band, the route line (solid and dashed), primary buttons, done markers, the planned-marker ring, the active tab, focus rings and the text caret. Chosen over the sketch's #0E8A4F because white text on it reaches 5.4:1; the sketch green only managed 4.4:1.
- **Deep Route Green** (#08603a): the hover and pressed state for anything filled green, including the back link and the + button.
- **Mint Signage** (#e3f5eb): the softer text on the green band (wordmark, back link, guide words). It holds 4.77:1 on Route Green.

### Secondary
- **Danfo Yellow** (#f2c230): the present moment only. The Now chip, the "You are here" stop, today's letter in the Review week strip, today's stop on the habit loop, and the travelling dot while a plan drafts. It also has two functional jobs: the focus ring on green surfaces and the text selection highlight. Ink text on it reads at 9.5:1.

### Tertiary
- **Signal Red** (#b42318): missed stops (ring and meta line), "At risk" labels, error messages. Used as text and as a 4px ring, never as a fill.
- **Signal Wash** (#fbe9e7): the background of the one at-risk panel on a task plan, under a Signal Red heading.

### Neutral
- **Forest Ink** (#12261c): all primary text and the ring around the yellow Now stop.
- **Sage Grey** (#4b6457): meta lines, inactive tabs, finished stop titles and times, placeholders. 5.9:1 on the ground.
- **Tinted Ground** (#f3f6f1): the page background beneath the band, and the fill of skipped markers.
- **Paper White** (#ffffff): panels, inputs, the tab bar, the next-stop card, primary-button text and the hollow of planned and missed markers.
- **Pale Track** (#dcefe3): secondary buttons, prompt chips, quiet-button hover, and the thin track lines of Mini Route and the Review week.
- **Pressed Track** (#cbe6d5): the hover of anything filled Pale Track.
- **Faint Rule** (#d5e0d9): 1px dividers between rows, the tab bar's edge, and the 2px resting border of inputs and quiz options.
- **Skipped Grey** (#6f8a7c): the ring and cross of a skipped stop (3.4:1 on Ground, so it still reads as a mark).
- **Field Edge** (#7f9688): the 2px border of inputs and quiz choices (3.2:1 on white, the minimum for a form control's edge).

### Named Rules
**The Here-and-Now Rule.** Danfo Yellow marks the present moment and nothing else: the current time, today, the stop in progress. Its only other uses are functional, as the focus ring on green and as the selection highlight.

**The White-on-Green Rule.** Text on Route Green is Paper White or Mint Signage only, and the green stays dark enough for white text to clear 4.5:1. Never lighten the brand green toward the sketch's #0E8A4F.

## Typography

**Display Font:** Overpass (with ui-sans-serif, system-ui, sans-serif)
**Body Font:** Overpass (same stack)

**Character:** One family descended from road-sign lettering: clear at a glance, with sturdy figures for times. Hierarchy comes from scale and weight, never from a second face, capitals or letter-spacing.

### Hierarchy
- **Display** (800, 2rem, 1.05, -0.02em, balanced wrapping): the screen title in the green band: the day name on Today, the plan name, "This week".
- **Headline** (800, 1.25rem, 1.25, -0.01em): the title inside the next-stop card. One per screen.
- **Title** (800, 1.125rem, 1.5556, -0.01em): section titles ("Updates", "Coming up", "Streaks") and the chat box question.
- **Body** (400, 1rem, 1.5): running text, input values, helper copy.
- **Body Semibold** (600, 1rem, 1.375): stop titles and row titles, the names you scan down the route.
- **Body Strong** (800, 1rem, 1.5): button text, plan titles in lists, terminus and stage names.
- **Numeral** (800, 0.9375rem, tabular figures): stop times in the left column. Every time and count anywhere uses tabular figures at 800.
- **Label** (600, 0.875rem, 1.4286): form labels, guide words in the band, quiet buttons, prompt chips, error text.
- **Caption** (400, 0.8125rem, 1.5): the meta line under a stop or plan ("Task ∙ 60 min ∙ step 3 of 4").

### Named Rules
**The Three Weights Rule.** Only 400, 600 and 800 are loaded. 400 is for reading, 600 for names, 800 for anything you act on or scan for: times, titles, buttons.

**The Plain Label Rule.** No eyebrows, kickers, uppercase labels or positive letter-spacing. Tracking only tightens, on display (-0.02em), headline and title (-0.01em) and the wordmark.

**The Centred Dot Rule.** Meta parts are joined by U+2219 "∙" with a space either side. Overpass sets the usual middle dot (U+00B7) off-centre, so it is not used.

## Layout

One centred column, max 576px wide, on every screen and at every width. The green header band spans the full viewport; its content and the main column share the same 576px measure. Phones get a 16px gutter in the main column and 20px in the band. Sections stack with 24px between them. The main column keeps 128px of bottom padding on phones so the fixed tab bar never covers the last stop, and 64px from 768px up. Safe-area insets are respected at the top of the band and the bottom of the tab bar.

The route uses a three-column grid: a 52px time column with right-aligned numerals, a 40px rail column holding the line and markers, and a flexible content column that is allowed to shrink so long titles wrap. Stops are spaced by 20px of bottom padding, not by gaps, so the line runs unbroken between them. Lists of updates, plans and upcoming sessions sit in white panels with 1px rules between rows; rows have 16px side and 14px vertical padding with 12px between icon and text.

From 768px the tab bar moves to a fixed top bar and the band gains 64px of top padding to clear it. From 640px Settings sets form labels in an 8rem column beside their fields. Nothing else changes with width: desktop is the phone column, centred.

### Named Rules
**The Three Column Rule.** Anything drawn as a route uses the 52px time column, 40px rail column and flexible content column, so lines and markers align from screen to screen.

## Elevation & Depth

The system is flat. No element casts a box-shadow, glows or blurs. Depth is tonal: the Route Green band sits above the Tinted Ground, and white panels, inputs and the next-stop card rest on the ground as lighter planes. The one raised object is the + button in the phone tab bar, lifted 28px above the bar and cut out of it by a 4px Tinted Ground ring rather than a shadow. Stacking is structural only: markers sit above the line, and the tab bar sits above the content.

### Named Rules
**The Flat Colour Rule.** No drop shadows, glows, blurs or smooth gradients. The only gradient in the system is the hard-stop pattern that draws the dashed route ahead, which reads as flat dashes.

## Shapes

The form language comes from the route map. Stops are circles with a 4px ring on a 4px line; the end of a line (a deadline or final milestone) is a filled square with gently rounded 6px corners, a terminus rather than a stop. A skill's stage change is a 20px by 4px pill laid across the line, like an interchange. Stop size follows one fixed ramp by length: up to 15 minutes 16px, up to 30 minutes 20px, up to 60 minutes 24px, longer 28px. Check and cross glyphs appear only at 20px and up.

Corners step up with size: 6px for chips and the terminus, 8px for quiet buttons and segmented options, 12px for buttons, inputs and quiz options, 16px for panels and the next-stop card, fully round for markers, prompt chips and the + button. Borders are 1px for dividers and bar edges, 2px for inputs, quiz options, the next-stop card and the circular Done button, and 4px for every marker ring.

## Components

### Buttons
Firm, heavy and immediate: every press answers the thumb.
- **Shape:** gently rounded (12px) for primary and secondary, 8px for quiet.
- **Primary:** Route Green with white 800-weight text, 12px by 20px padding, an optional 20px leading icon at an 8px gap. On the next-stop card Done grows to fill the row with 14px vertical padding.
- **Secondary:** Pale Track with Forest Ink 800-weight text, 10px by 16px padding. Used for Skip, Redraft, Save, Pause and the deadline extensions.
- **Quiet:** no fill, Sage Grey 600-weight 14px text; Pale Track fill and ink text on hover. Used for Undo, Not yet, Discard and Archive.
- **Done circle:** a 44px circle with a 2px Route Green ring and a green check, beside stops that are not next; Pale Track fill on hover.
- **Hover / Focus / Press:** filled buttons deepen on hover (Route Green to Deep Route Green; Pale Track to Pressed Track). Focus shows a 3px Route Green outline at 2px offset, switching to Danfo Yellow inside the green band. Pressing scales to 0.97 over 160ms with cubic-bezier(0.23, 1, 0.32, 1). Disabled drops to 60% opacity.

### Chips
- **Now chip:** Danfo Yellow, ink 800-weight tabular text, 6px corners, 2px by 6px padding. It holds the current time in the band and on the route.
- **Prompt chips:** fully round Pale Track pills with 600-weight 14px text, offering example goals under an empty chat box; Pressed Track on hover.
- **Segmented choice:** Quick add's Task / Habit switch is a 12px-cornered Tinted Ground track with 4px padding; the selected option is a white 8px-cornered tab in ink, the other Sage Grey.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Paper White on the Tinted Ground; the at-risk panel uses Signal Wash with a Signal Red 800-weight heading.
- **Shadow Strategy:** none (see Elevation & Depth).
- **Border:** none on panels; the next-stop card alone carries a 2px Route Green border.
- **Internal Padding:** 16px, or 20px for single-message panels.

### Inputs / Fields
- **Style:** Paper White fill, 2px Faint Rule border, 12px corners, 12px by 14px padding, 16px text, Sage Grey placeholder, Route Green caret.
- **Focus:** the border turns Route Green; the outline ring is suppressed because the border carries focus.
- **Choices:** quiz options are 12px-cornered rows with a 2px Faint Rule border that turn Route Green over a Pale Track fill when checked. Native checkboxes and radios take Route Green as their accent.
- **Error:** 14px 600-weight Signal Red text under the form, announced as an alert.

### Navigation
- **Phones:** a fixed white bar at the bottom with a 1px Faint Rule top edge: Today, Plans, a raised 56px Route Green + in the middle, Review, Settings. Each tab is a 24px icon over a 12px label. Inactive tabs are Sage Grey at 600 and turn ink on hover; the active tab is Route Green at 800 and marked as the current page.
- **From 768px:** the same bar becomes a 64px top bar with a bottom edge: the Stride wordmark in Route Green, tabs with 20px icons beside 14px labels, and the + becomes a 12px-cornered "New plan" button at the end.
- **Back:** inner screens replace the band's wordmark with a back link in Mint Signage (chevron plus the parent's name).
- **Icons:** one set on a 24px grid with 2px round strokes and round joins, drawn to match the route line. The Today icon is itself a two-stop route.

### Route Stops (signature)
The day's route on Today.
- **Rail:** each stop's rail column holds an 8px stub above the marker and a line below it that fills the rest of the row. Behind the current time the line is solid Route Green; ahead it is dashed, 8px dashes every 14px, and the stub above an upcoming marker is left empty so the dashes stop short of it. Both are drawn as 4px background strips inside the rail column, never as borders on the content.
- **Marks:** done is a filled Route Green circle with a white check; skipped is a Skipped Grey ring on Tinted Ground with a grey cross; missed is a hollow Signal Red ring; planned is a hollow Route Green ring.
- **Text:** the time sits right-aligned in the time column at 15px 800 tabular; the title is 16px 600; the meta line is 13px Sage Grey. Finished stops turn their time and title Sage Grey, skipped titles are struck through, and a missed stop's meta line turns Signal Red and starts "Missed ∙".
- **Now stop:** a 24px Danfo Yellow circle with a 4px Forest Ink ring, the time in a Now chip, and "You are here" at 14px 800.
- **Next stop:** the first planned stop becomes the one card on the screen: white, 2px Route Green border, 16px corners, the title at headline size, the meta line, then a full-width Done and a smaller Skip.
- **Actions:** other open stops carry the 44px Done circle; finished stops carry a quiet Undo. Done and Skip change the marker immediately and save in the background; the fill fades over 200ms and the check draws itself over 260ms after a 60ms delay.
- **Arrival:** when Today opens, the route draws itself downward once, a 520ms top-to-bottom reveal on cubic-bezier(0.23, 1, 0.32, 1).

### Plan Routes (signature)
Plan detail draws steps, levels or milestones as a solid route on the same three-column grid. The left column carries a 14px 800 Sage Grey label (a step time, "L2", a week count). The last stop is the terminus square, with its title at 800. Skill stages sit on the line as headings at 16px 800, marked by the interchange pill across the line.

### Mini Route, Habit Loop and Week Strip
- **Mini Route:** a plan's progress in the Plans list as a row of 14px markers spread evenly over a 3px Pale Track line, labelled as one image for screen readers.
- **Habit Loop:** a habit's last seven days as a circle of stops on a 4px Route Green ring, oldest at the top. Day initials sit outside the ring at 13px 600 Sage Grey; the streak sits in the middle as a 46px 800 tabular numeral over "day streak". Today's stop, while still open, is Danfo Yellow with an ink ring, and its initial turns ink at 800.
- **Week Strip:** Review shows the week as seven short vertical routes on 3px Pale Track lines with 14px markers, under single-letter day names; today's letter sits in a yellow chip.

### Drafting Indicator
While the laptop drafts a plan, a 16px Danfo Yellow stop with an ink ring travels back and forth along a short dashed green line, 1400ms each way on cubic-bezier(0.32, 0.72, 0, 1). It is the only looping motion in the system.

### Named Rules
**The Line Is A Background Rule.** The route line is a 4px background strip in the rail column: filled for the past, a hard-stop dash pattern for what is ahead. It is never a border or side stripe on a card or row.

**The Set-Apart Rule.** Final or destructive actions (Discard, Archive) are quiet buttons placed away from the primary action: Discard sits centred beneath the draft's Accept and Redraft, and Archive is pushed to the far end of its row.

**The One Moment Rule.** The route-draw on Today is the only authored entrance. Every other motion answers a touch (press scale, marker fill, check stroke) or a wait (the travelling dot), and reduced-motion preferences switch off all of them: the route-draw, the travelling dot, the press scale, the marker fill and check-stroke transitions, and the chevron turn.

## Do's and Don'ts

### Do:
- **Do** draw every sequence of work as stops on one 4px Route Green line: solid behind the current time, dashed ahead (8px dashes every 14px).
- **Do** show state as a mark on the stop: filled green with a check for done, grey ring and cross for skipped, red ring for missed, green ring for planned.
- **Do** size stops by length with the fixed ramp (16px, 20px, 24px, 28px at 15, 30, 60 and more minutes) and draw glyphs only at 20px and up.
- **Do** set every time and count in Overpass 800 with tabular figures.
- **Do** join meta parts with U+2219 "∙" and a space either side: "Task ∙ 60 min ∙ step 3 of 4".
- **Do** keep one next-stop card per screen and let it be the only bordered card.
- **Do** give every tappable element the press response: scale 0.97 over 160ms, removed under reduced motion.
- **Do** keep focus visible: a 3px Route Green outline at 2px offset, Danfo Yellow on green surfaces.

### Don't:
- **Don't** use yellow for anything but the present moment, the focus ring on green and the selection highlight.
- **Don't** lighten the brand green toward #0E8A4F; white text on it falls to 4.4:1.
- **Don't** add eyebrow or kicker labels above headings, and don't set uppercase or letter-spaced labels.
- **Don't** use the U+00B7 middle dot as a separator; it sits off-centre in Overpass.
- **Don't** draw the route line as a border or coloured side stripe on a card or row.
- **Don't** add drop shadows, glows, blurs or smooth gradients.
- **Don't** put state in badges or pills; the marker is the state.
- **Don't** place Discard or Archive next to the primary action.
- **Don't** load weights other than 400, 600 and 800, or a second typeface.
