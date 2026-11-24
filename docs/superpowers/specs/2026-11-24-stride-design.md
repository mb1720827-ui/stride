# Stride: design

An AI personal assistant for **tasks, habits and skills**. You type what you want in plain words ("submit my assignment in 3 days", "I want to read every day", "I want to learn backend development"), it drafts a structured plan, and it keeps you on track with well-timed reminders.

Status: design, awaiting approval. Date: 2026-11-24.

## 1. Intent

- **Who it's for:** mainly the owner (a software engineering student in Nigeria), used every day. Other people can sign up and use it too.
- **Why:** a daily tool for getting things done and building habits and skills, not only a portfolio piece.
- **Success:** the owner opens it every morning, follows the plan, keeps streaks going, and makes visible progress on at least one skill within a month.

## 2. Goals, non-goals, anti-goals

**Goals (first version)**

1. Chat-first input: one box where you type a task, habit or skill in plain words.
2. Tasks: broken into steps, scheduled into your free time before the deadline, rescheduled when you fall behind.
3. Habits: a starting level, gradual progression, best time and trigger, check-ins, streaks, a plan for missed days, and adjustment to how consistent you really are.
4. Skills: a roadmap from beginner to advanced, milestones, weekly study sessions, **checked** free-first resources, and short quizzes at milestones.
5. One dashboard ("Today" plus progress on everything active).
6. Smart notifications: helpful, well-timed, capped, and adapting to when you actually respond.
7. Weekly review with suggested adjustments.
8. Links with Takeaway (section 8).

**Non-goals (not in the first version)**

- Two-way Google Calendar sync (first version gives a calendar feed instead; see 7.5).
- Uploading course PDFs and slides.
- A native mobile app (it's a web app you can add to your home screen).
- AI for users other than the owner (see 4). The design keeps this a one-function change.
- Voice input, languages other than English, payments.

**Anti-goals (failure even if it "works")**

- Spammy or guilt-tripping notifications. Too many pings and people turn them all off.
- Made-up resources. A link that doesn't exist or doesn't match its description is worse than no link.
- The AI changing your plans on its own. It proposes; you accept.
- Losing your data because the laptop is off. Everything that doesn't need AI works without the laptop.

## 3. Approaches considered

| | Approach | Trade-off |
|---|---|---|
| **A (chosen)** | AI runs on the owner's laptop through Claude Code, like Takeaway's worker | Free on the owner's Claude plan. Plans arrive 30–60 s after you type, and only while the laptop is on. Everything else runs on the server. |
| B | Claude API on the server | Instant, works for every user with the laptop off. Costs money per plan and per web search; needs a paid API key, a spending cap and per-user limits. |
| C | Both: API for quick parts, laptop for heavy parts | Best experience at low API cost, but two AI paths to build and maintain. |

**Chosen: A**, built so that moving to B later means replacing one function (`runPlanner()` in section 6). Chosen because the owner is the main user, it costs nothing, and it matches how Takeaway already works.

## 4. Who gets the AI

The laptop worker signs in **as the owner** (email and password in `.env.local`, exactly like Takeaway). Row-level security then means it can only ever see the owner's requests. Other users can never use the owner's Claude plan, by construction, not by a check that could be forgotten.

Other users get everything that doesn't need AI: quick-add forms for tasks, habits and skill sessions, Today, reminders, streaks, the weekly stats and the calendar feed. Their chat box says that AI planning isn't available on this copy and offers the forms. Switching to approach B later turns AI on for everyone.

## 5. Product design

### 5.1 Screens

- **Today** (home): a timeline of today's items: task steps, habit check-ins, skill sessions and "Recall N cards" from Takeaway. Each has **Done** / **Skip** / **Snooze**. At the top: the chat box.
- **Plans**: every active task, habit and skill with its progress (task: steps done and deadline risk; habit: streak, level, last-30-day consistency; skill: current stage, milestone progress).
- **Plan page**: a task's steps, a habit's framework, or a skill's roadmap with resources and quizzes. Edit, pause, archive.
- **Review**: this week's summary and suggested changes (accept or ignore each).
- **Settings**: free-time blocks per weekday, wake and sleep time, quiet hours, notification cap, time zone (default Africa/Lagos), push notification switch, calendar feed link, Takeaway link.

Sketch of Today on a phone:

```
 Stride                     Plans  Review  ⚙
 ┌──────────────────────────────────────────┐
 │ What do you want to do?                  │
 │ e.g. "finish my report by Friday"        │
 └──────────────────────────────────────────┘
 Tuesday · 3 of 7 done

 06:00  ✓ Wake at 6:00 (level 2 of 4)   🔥 9
 07:30  ☐ Read 15 pages                 🔥 4
 18:00  ☐ Project report: write intro   due Fri
 19:00  ☐ Backend: SQL joins (45 min) · 2 links
 20:30  ☐ Recall 6 cards  ↗ Takeaway
```

### 5.2 Main flows

1. **Type → plan → accept.** You type in the chat box. A request row is saved with status `queued` and Today shows "Drafting your plan…". The worker classifies it (task, habit, skill, or a command such as "move my reading to 8pm"), drafts a plan, and sets status `ready`. You get a push notification, open the preview, and choose **Accept**, **Change** (type what to change; it re-drafts) or **Discard**. Nothing is added to your schedule until you accept.
2. **Daily loop.** Morning brief at wake time ("6 things today, first at 7:30"). A reminder at each item's start time. Evening check-in for anything unmarked. Done/Skip from the notification or Today.
3. **Falling behind.** Every night the scheduler moves undone task steps into the next free slots before the deadline. If they no longer fit, the task is marked **at risk** and you're offered: extend the deadline, drop optional steps, or add time.
4. **Missed habit.** One miss: a "never miss twice" reminder at the next slot, at the current level. Two in a row: the next session uses the easier "minimum version" (for example 2 pages instead of 15). Weekly adjustment in 7.3.
5. **Skill progress.** Weekly study sessions appear on Today. At each milestone, a 5-question quiz. 4 or 5 right: next milestone. 3 or fewer: one more review session on the weak parts, then retake.
6. **Weekly review.** Sunday evening the worker writes a summary (completed, streaks, quiz results, at-risk tasks) and up to 3 suggested changes; each can be accepted with one tap.

## 6. AI architecture

The AI only **drafts**; deterministic code **schedules and adapts**. This keeps plans predictable, testable, and working when the laptop is off.

```
 phone/web ──► stride_requests (queued) ──► laptop worker ──► Claude Code (JSON schema)
                                              │                       │
                                              │ ◄──── draft plan ◄────┘
                                              ▼
                     stride_requests (ready, draft JSON) ──► you Accept ──► scheduler (code)
                                                                               │
                                     stride_items (dated, timed) ◄────────────┘
                                              │
 pg_cron every 5 min ──► /api/tick ──► due notifications ──► Web Push
```

- **Worker:** a Node script on the laptop (same pattern as Takeaway: `npm run worker`, Task Scheduler auto-start, logs to `worker.log`). Polls every 15 s for `queued` requests, weekly-review jobs and resource checks.
- **`runPlanner(kind, input, context)`**: the single place that calls the AI. Approach A: spawns Claude Code headless with `--json-schema`, `--permission-mode dontAsk`, no personal settings, hooks, plugins or MCP servers, `--no-session-persistence`, in an empty temp folder. Approach B later: the same signature calling the Claude API.
- **Outputs** are Zod schemas converted with `z.toJSONSchema(schema, { target: "draft-7" })`:
  - `TaskPlan`: title, deadline, steps (title, minutes, optional, order).
  - `HabitPlan`: habit, 3–5 levels (amount + unit, e.g. 5 → 10 → 15 pages), minimum version, preferred time window, trigger ("after breakfast"), recovery tip.
  - `SkillPlan`: stages (beginner → advanced), milestones with target weeks, weekly session template (sessions per week, minutes), resource *queries* per stage.
  - `Command`: action (move, reschedule, pause, done, list) plus the target, resolved against your active plans.
  - `Quiz`: 5 multiple-choice questions with answer index and one-line explanation.
  - `WeeklyReview`: summary and up to 3 suggested changes in the same shapes the scheduler accepts.
- **Context sent with each request:** today's date and time zone, free-time blocks, active plans (titles and dates), and for skills the owner's relevant Takeaway saves (section 8).
- **Resource curation:** a separate worker step for skill plans. Claude Code gets the `WebSearch` and `WebFetch` tools only, searches for free resources first, and must return each resource with its URL, type (book, course, video, article, exercise, project), cost (free or paid) and a one-line reason. Every URL is then fetched **by the worker's own code**; anything that doesn't return HTTP 200 is dropped. Page text is treated as data, never as instructions.
- **Safety of AI output:** every result is validated with Zod; invalid output fails the request with a plain-English error and a **Try again** button. The AI never writes to the database directly; the worker inserts validated rows.

## 7. Engines (code, no AI)

### 7.1 Scheduler

- Input: your free-time blocks per weekday, wake and sleep time, existing items, and the accepted plan.
- Tasks: places steps in order into free slots between now and the deadline, earliest first, leaving the last 20% of time before the deadline empty as a buffer when possible.
- Habits: one slot a day inside the preferred window, or at the trigger time.
- Skills: spreads the weekly sessions over the week's free blocks, never two on the same day when avoidable.
- Nightly rerun (00:05 local time): moves undone task steps forward; marks tasks at risk when they don't fit.
- Pure functions with unit tests (same approach as Takeaway's `recall.ts`).

### 7.2 Notifications

- **Web Push** (VAPID, `web-push` npm package) to the browser or the home-screen app. Android works in Chrome; iPhone needs the app added to the home screen first (iOS 16.4+).
- **Sender:** Supabase `pg_cron` calls `POST /api/tick` every 5 minutes with a secret header (Vercel's free plan only runs its own cron jobs once a day). The route calls a `SECURITY DEFINER` function that checks the secret's hash and returns due notifications with their push subscriptions, then sends them and marks them sent. No service-role key is used anywhere.
- **Rules that keep it from being annoying:** quiet hours (default 22:30–06:30); a daily cap (default 8) where the morning brief and evening check-in always fit and lower-priority reminders are merged into them first; no repeat reminder for an item already done or skipped.
- **Adapting:** the app records when you act on each kind of reminder. After 2 weeks, a habit's reminder moves toward the median time you actually check it in (within its preferred window). Reminders you ignore 5 times in a row are folded into the morning brief instead of sent on their own.

### 7.3 Habit adaptation

Once a week per habit: 6–7 of 7 days done → offer to move up a level. 3 or fewer → move down a level and say why. 4–5 → stay. Streaks count days done; a skipped (not missed) day on a planned rest day doesn't break a streak.

### 7.4 Weekly review

Stats (completed, missed, streaks, quiz scores) are computed in SQL. The worker only writes the friendly summary and the suggested changes on top. With the laptop off, the review still shows the stats.

### 7.5 Calendar

A private, per-user iCalendar feed URL (`/api/calendar/<token>.ics`) with all scheduled items. Add it once in Google Calendar ("From URL") or Apple Calendar. Trade-off: Google refreshes subscribed calendars on its own schedule, sometimes hours later; the app and its notifications are always current. Two-way Google Calendar sync is a later step (it needs Google's app verification for other users).

## 8. Linking with Takeaway

Same Supabase project, so **one account**: sign in with the same email and password on both sites.

1. **Recall on Today.** When you have Takeaway Recall cards due, Today shows "Recall N cards" linking to Takeaway's `/recall`. Read with your own session (row-level security already allows it).
2. **Saves feed skills.** When you create a skill plan, the worker includes your matching Takeaway saves (by full-text search on the skill name) and may use them as resources at the right stage, marked "From your saves".
3. **New saves attach to skills.** Takeaway's worker gets your active skill names in its prompt and may set `skill_id` on a save that clearly belongs to one. The skill page lists them. (Small change in the Takeaway repo: one nullable column and one prompt line.)
4. **"Make this a habit or task."** On a Takeaway item page, the "Try this" action items get a button that opens Stride's chat box with the text filled in.

## 9. Data model (Supabase, shared project, `stride_` prefix)

All tables: `user_id uuid default auth.uid()`, row-level security "owners manage their rows".

- `stride_settings`: free blocks (JSON per weekday), wake, sleep, quiet hours, daily cap, time zone, calendar token hash.
- `stride_requests`: text typed, status (queued, processing, ready, accepted, discarded, failed), kind, draft JSON, error, timestamps.
- `stride_plans`: kind (task, habit, skill), title, status (active, paused, done, archived), deadline (tasks), plan JSON (levels, roadmap), current level or stage, created/accepted dates.
- `stride_items`: one scheduled thing: plan id, title, starts_at, minutes, status (planned, done, skipped, missed), optional link (resource or Takeaway URL).
- `stride_resources`: skill plan id, stage, title, URL, type, free flag, reason, checked_at, from_takeaway item id.
- `stride_quizzes` and `stride_quiz_attempts`: questions JSON, milestone, score.
- `stride_push_subscriptions`: endpoint and keys per device.
- `stride_notifications`: item or brief, send_at, priority, sent_at, acted_at (feeds adaptation).
- `stride_reviews`: week, stats JSON, summary, suggestions JSON, accepted flags.
- Takeaway: `takeaway_items.skill_id uuid null references stride_plans on delete set null`.

## 10. Tech stack

Next.js 16 (App Router, Server Actions, Cache Components), TypeScript, Tailwind CSS, Supabase (Postgres, Auth, row-level security, pg_cron, pg_net), Zod, Vitest, `web-push`, Claude Code (laptop worker), Vercel. The same stack and conventions as Takeaway and ExamPal.

## 11. Security and privacy

- Row-level security on every table; the worker signs in as the owner and never uses an admin key.
- `/api/tick` and the calendar feed use random tokens stored only as SHA-256 hashes, checked by `SECURITY DEFINER` functions (Takeaway's inbox-token pattern).
- Claude Code runs isolated: empty temp folder, no shell or file-writing tools, no personal settings, plugins or MCP servers. Web content is data, never instructions.
- No secrets in `NEXT_PUBLIC_` variables. Exact-domain redirect URLs in Supabase (no wildcards).

## 12. Build plan

Each phase ends deployed and usable.

1. **Skeleton:** Next.js app, auth, migrations, settings, quick-add forms, Today, Plans, Done/Skip, scheduler (with tests). Usable without AI.
2. **Notifications:** Web Push subscription, `/api/tick`, `pg_cron`, morning brief, evening check-in, quiet hours, cap.
3. **Worker and chat:** laptop worker, `runPlanner()`, task and habit plans, preview → accept/change/discard, commands, Task Scheduler auto-start.
4. **Skills:** roadmap plans, resource search plus URL checks, sessions on Today, milestone quizzes.
5. **Adapting:** nightly reschedule and at-risk tasks, habit level changes, reminder timing, weekly review.
6. **Takeaway links and calendar:** Recall on Today, saves to skills, `skill_id` in Takeaway, "make this a habit" button, iCal feed.
7. **Ship:** README, AGENTS.md, tests passing, deploy, add the Vercel domain to Supabase redirect URLs, resume entry.

## 13. Calls made by the designer (check these)

- Name "Stride" (repo `mb1720827-ui/stride`, free on GitHub at the time of writing).
- Separate app from Takeaway, sharing its Supabase project and account.
- Other users get the non-AI features only until approach B (section 4).
- Web Push instead of ntfy, so other users don't need an extra app.
- An iCal feed instead of two-way Google Calendar sync in the first version.
- Defaults: quiet hours 22:30–06:30, cap of 8 notifications a day, time zone Africa/Lagos, 5-question milestone quizzes, the habit adjustment thresholds in 7.3.

## 14. Left to the builder

- Exact prompts, and the wording and visual design of each screen.
- Slot-picking details inside the scheduler beyond 7.1.
- Whether Claude Code's isolated mode allows `WebSearch`/`WebFetch` as configured. If not, find the narrowest flags that do, and note them in the README.
