# Stride

**Type what you want to do in plain words. Stride turns it into a plan that fits your free time, and keeps you on track.**

- "Submit my CSC 401 assignment in 3 days" → 8 small steps placed in your free evenings, with a buffer before the deadline.
- "I want to read every day" → a habit that starts easy (5 pages) and levels up as you stay consistent, at a time that fits your day.
- "I want to learn SQL for backend development" → a roadmap from beginner to advanced, weekly study sessions, free resources whose links are checked, and a 5-question quiz at each milestone.

Built for one person first (a university student in Nigeria), usable by anyone.

## Features

- **Chat-first:** one box for tasks, habits, skills and changes ("move my reading to 7am"). You see the drafted plan and choose **Accept**, **Redraft** (say what to change) or **Discard**. Nothing is scheduled until you accept.
- **Today:** a timeline of task steps, habit check-ins and study sessions with **Done** / **Skip**, plus due Recall cards from [Takeaway](https://github.com/mb1720827-ui/takeaway).
- **Tasks:** steps go into your free time before the deadline, leaving the last 20% as a buffer. Missed steps are rescheduled; if they no longer fit, the task is marked **at risk** with one-tap fixes.
- **Habits:** 3–5 levels, a trigger, a "bad day" minimum and a recovery rule. Weekly check: 6–7 days done offers a level up, 3 or fewer moves you down a level, and two misses in a row switch the next session to the minimum. After 14 check-ins, the reminder moves to the time you actually do it.
- **Skills:** stages, milestones, weekly sessions, free-first resources (each link fetched and checked by code, not trusted from the AI), your own Takeaway saves as resources, and milestone quizzes (4 of 5 to pass, otherwise a review session is added).
- **Notifications (Web Push):** a morning brief, a reminder when each thing starts (with Done / Skip buttons), and an evening check-in. Quiet hours and a daily limit; reminders you keep ignoring move into the morning brief.
- **Weekly review:** stats every week, plus a short coaching summary and up to 3 suggested changes on Sunday evening.
- **Calendar:** a private link for Google or Apple Calendar.
- **Quick add:** tasks and habits without the AI, so everything works with the laptop off.

## How it works

```
 phone / browser ──► stride_requests (queued) ──► laptop worker ──► Claude Code (JSON schema)
                                                       │                    │
                                                       │ ◄── draft plan ◄───┘  (+ WebSearch for resources,
                                                       ▼                          links checked by code)
           stride_requests (ready) ──► you Accept ──► scheduler (TypeScript) ──► stride_items
                                                                                       │
 Supabase pg_cron every 5 min ──► /api/tick ──► due notifications (SQL) ──► Web Push ◄─┘
```

The AI only **drafts**. Ordinary, tested TypeScript does the scheduling, rescheduling, habit levels and reminder timing (`src/lib/schedule.ts`, `habits.ts`, `maintain.ts`), so plans are predictable and everything except drafting works with the laptop off.

## Design decisions

- **The AI runs on my laptop through Claude Code**, so there's no API bill. It signs in as the owner, so row-level security means it can only ever see the owner's requests: other accounts get every non-AI feature. Moving to the Claude API later means replacing one function, `runPlanner()` in `src/lib/claude.ts`.
- **Claude Code runs isolated:** an empty temporary folder, no shell or file-writing tools, no personal settings, hooks, plugins or MCP servers, and a JSON schema for its output, validated again with Zod. Web pages are treated as data.
- **No admin keys.** The notification sender and the calendar feed use random tokens stored only as SHA-256 hashes and checked inside `SECURITY DEFINER` database functions. Push endpoints are limited to the browsers' push services (in code and by a database constraint), so the server can't be pointed at other hosts.
- **Time zones are explicit:** every schedule is computed in the user's time zone with `Intl` (tested across midnight and daylight-saving changes) and stored in UTC.
- **Shares a Supabase project and account with Takeaway**, so saved videos can become skill resources and Recall cards show up on Today.

## Set up

1. **Database:** run the files in [`supabase/migrations/`](supabase/migrations/) in your Supabase project's SQL Editor, oldest first.
2. **App:** copy `.env.example` to `.env.local`, fill in Supabase, generate Web Push keys (`npx web-push generate-vapid-keys`) and a long random `STRIDE_TICK_SECRET`. Deploy to Vercel with the same variables (not the worker ones). Add `https://<your-app>/auth/callback` to Supabase's redirect URLs.
3. **Notification timer:** store the tick secret's hash and schedule the call (replace the URL and secret):
   ```sql
   insert into public.stride_tick_secret (id, hash) values (1, encode(sha256(convert_to('<secret>', 'UTF8')), 'hex'))
     on conflict (id) do update set hash = excluded.hash;
   select vault.create_secret('<secret>', 'stride_tick_secret');
   select cron.schedule('stride-tick', '*/5 * * * *', $$
     select net.http_post(
       url := 'https://<your-app>/api/tick',
       headers := jsonb_build_object('x-tick-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'stride_tick_secret'))
     ) $$);
   ```
   (Enable the `pg_cron` and `pg_net` extensions first.)
4. **Laptop:** install Claude Code, fill in the worker section of `.env.local` with your Stride account, then:
   ```bash
   npm install
   npm run worker          # keeps running; or: npm run worker -- --once
   # Windows: start it automatically at login (hidden, restarts if it stops, logs to worker.log)
   powershell -ExecutionPolicy Bypass -File worker\install-autostart.ps1
   ```
5. **Phone:** open the app, go to Settings and turn on notifications (on iPhone, add it to the home screen first).
6. **Free-model fallback (optional):** if Claude Code reports that your Claude usage limit is reached, the worker retries the job on free models through [FreeLLMAPI](https://github.com/tashfeenahmed/freellmapi). Set it up with `npx freellmapi setup-claude --profile free --url http://127.0.0.1:31415` and keep the FreeLLMAPI app open. Free models are weaker, so check the plans they draft.

## Development

```bash
npm test       # time zones, scheduler, habits, plan schemas, maintenance, push, calendar, worker helpers
npm run lint
npm run build
```

## License

MIT
