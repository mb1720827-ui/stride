# For AI coding agents

- Design: `docs/superpowers/specs/2026-11-24-stride-design.md`. Plan: `docs/superpowers/plans/2026-11-24-stride.md`.
- The AI only drafts (`worker/`, `src/lib/claude.ts`). Scheduling and adapting are pure, tested TypeScript in `src/lib/` (`time`, `schedule`, `habits`, `plans`, `maintain`). Keep it that way: add a failing test before changing them.
- Times: always go through `src/lib/time.ts` (user time zone in, UTC out). Never use the server's local time.
- Security: row-level security on every `stride_` table; never add a service-role key. Tokens are stored as SHA-256 hashes and checked in `SECURITY DEFINER` functions. Push endpoints must pass `isPushEndpoint()`.
- Next.js 16 with Cache Components: signed-in pages call `requireUser()` (which awaits `connection()`) inside `<Suspense>`.
- Checks: `npm test`, `npm run lint`, `npm run build`.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
