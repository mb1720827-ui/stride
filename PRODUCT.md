# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primarily the owner: a software engineering student at a Nigerian university who uses Stride every day on an Android phone. Other people can sign up and use everything except AI drafting, which runs only on the owner's laptop for now.

## Product Purpose

Stride turns what someone types in plain words ("submit my assignment in 3 days", "read every day", "learn SQL") into a plan that fits their free time, then keeps them on track: task steps before a deadline, habits that level up with consistency, and skill roadmaps with checked resources and milestone quizzes. Success is opening it every morning, following the plan, keeping streaks, and visible progress on at least one skill within a month.

## Positioning

The AI only drafts; nothing is scheduled until the user accepts it, and plain, tested code does the scheduling, rescheduling and habit adaptation, so the plan stays predictable and works with the laptop off. It shares an account with Takeaway, so saved videos become skill resources and due Recall cards show up on Today.

## Operating Context

- Quick phone check-ins during the day: see what's next, tap Done or Skip.
- Morning planning (morning brief) and evening check-off (evening check-in).
- Often entered from a push notification, including Done / Skip straight from the notification.
- New goals are typed into one chat box; drafts arrive 30–60 seconds later while the owner's laptop is on.
- Time zone Africa/Lagos by default; free-time blocks set per weekday in Settings.

## Capabilities and Constraints

- Screens: Today (chat box, drafts in progress, at-risk tasks, level-up offers, Recall link, today's timeline, Quick add), plan draft preview (Accept / Redraft / Discard, quiz form), Plans list, plan detail, weekly Review, Settings (notifications, calendar link, free time, quiet hours, limits), login.
- Item states: planned, done, skipped, missed. Plan kinds: task, habit, skill; plan states: active, paused, done, archived.
- Next.js 16 App Router with Cache Components and Server Actions, Tailwind CSS 4, Supabase. Installable as a home-screen web app (manifest, service worker, Web Push).
- Non-owners see Quick add instead of AI chat.

## Brand Commitments

- Name: Stride, and the app icon, a white "S" on green (`public/icon-192.png`, `public/icon-512.png`), stay.
- Green stays the main colour.
- Must not feel childish or gamey, dark or techy, cold or corporate, or busy (owner's words, 2026-11-24).

## Evidence on Hand

No testimonials, user counts or metrics exist; none may be invented.

## Product Principles

1. One-tap progress: marking something done or skipped must be instant and thumb-friendly, wherever the user is.
2. Calm, never guilt: missed days are normal; the product reschedules and offers the easier version instead of scolding.
3. Visible, rewarding progress: streaks, levels, milestones and the week's work should be easy to see and feel earned.
4. Nothing happens without consent: AI drafts are previews until accepted.
5. Quick in, quick out: most visits are a few seconds long; what's next must be clear at a glance.
