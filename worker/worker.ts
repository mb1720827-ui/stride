// Stride worker: runs on your laptop and drafts plans, quizzes and weekly reviews with Claude Code (your Claude plan,
// no API key). It signs in as you, so it only ever sees your own requests. Start it with: npm run worker
// (or once: npm run worker -- --once)
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { findClaude, runPlanner } from "../src/lib/claude";
import { streak } from "../src/lib/habits";
import { loadSettings, maintain } from "../src/lib/maintain";
import { Draft, DraftForAI, milestones, Quiz, ResourceList, WeeklyReviewDraft, type DraftT, type SkillPlanT } from "../src/lib/plans";
import { deliver, sendPush, type DueRow } from "../src/lib/push";
import { localParts, zoned } from "../src/lib/time";
import { checkLinks, reviewDue, weekStartOf } from "../src/lib/worker-helpers";

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const required = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} in .env.local (see .env.example)`);
  return value;
};

const POLL_MS = Number(process.env.STRIDE_POLL_SECONDS ?? 15) * 1000;
const ONCE = process.argv.includes("--once");
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const supabase = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"), {
  auth: { persistSession: false },
});
const prompt = (name: string) => readFileSync(join(process.cwd(), "worker", name), "utf8");
const log = (message: string) => console.log(`[${new Date().toLocaleTimeString()}] ${message}`);

interface Request {
  id: string;
  text: string;
  kind: string | null;
  plan_id: string | null;
  draft: unknown;
  feedback: string | null;
}

async function main() {
  const { error } = await supabase.auth.signInWithPassword({ email: required("STRIDE_EMAIL"), password: required("STRIDE_PASSWORD") });
  if (error) throw new Error(`Couldn't sign in as STRIDE_EMAIL: ${error.message}`);
  const claude = findClaude();
  // Anything left "processing" was interrupted (this is the only worker), so try it again.
  await supabase.from("stride_requests").update({ status: "queued" }).eq("status", "processing");
  log(`Worker running with ${claude}. Checking for requests every ${POLL_MS / 1000}s.`);

  let maintainedAt = 0;
  for (;;) {
    if (Date.now() - maintainedAt > 5 * 60_000) {
      await maintain(supabase).catch((err) => log(`Maintenance failed: ${err}`));
      maintainedAt = Date.now();
    }
    for (let req = await claimNext(); req; req = await claimNext()) await processRequest(req, claude);
    await weeklyReview(claude).catch((err) => log(`Weekly review failed: ${err}`));
    if (ONCE) return;
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}

async function claimNext(): Promise<Request | null> {
  const { data: next } = await supabase
    .from("stride_requests")
    .select("id, attempts")
    .eq("status", "queued")
    .lt("attempts", 3)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (!next) return null;
  const { data } = await supabase
    .from("stride_requests")
    .update({ status: "processing", attempts: next.attempts + 1, updated_at: new Date().toISOString() })
    .eq("id", next.id)
    .eq("status", "queued")
    .select("id, text, kind, plan_id, draft, feedback")
    .maybeSingle();
  return data;
}

async function processRequest(req: Request, claude: string) {
  const started = Date.now();
  log(`Drafting: ${req.text.slice(0, 80)}`);
  try {
    const draft = req.kind === "quiz" ? await makeQuiz(req, claude) : await makeDraft(req, claude);
    const kind = req.kind === "quiz" ? "quiz" : (draft as DraftT).kind;
    await supabase.from("stride_requests").update({ status: "ready", kind, draft, error: null, updated_at: new Date().toISOString() }).eq("id", req.id);
    log(`Ready (${kind}) in ${Math.round((Date.now() - started) / 1000)}s`);
    const title = req.kind === "quiz" ? "Your quiz is ready" : "Your plan is ready";
    await notifyOwner(title, req.text.slice(0, 120), `/requests/${req.id}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`Failed: ${message}`);
    await supabase
      .from("stride_requests")
      .update({ status: "failed", error: `Couldn't draft this: ${message.slice(0, 200)}`, updated_at: new Date().toISOString() })
      .eq("id", req.id);
  }
}

/** "+01:00" for the time zone right now. */
function offset(now: Date, tz: string): string {
  const p = localParts(now, tz);
  const minutes = Math.round((zoned(p.date, p.minutes, "UTC").getTime() - Math.floor(now.getTime() / 60_000) * 60_000) / 60_000);
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}:${String(abs % 60).padStart(2, "0")}`;
}

async function context() {
  const settings = await loadSettings(supabase);
  const tz = settings.time_zone;
  const now = new Date();
  const p = localParts(now, tz);
  const { data: plans } = await supabase.from("stride_plans").select("kind, title").eq("status", "active");
  const free = DAYS.map((d, i) => `${d} ${(settings.free_blocks[String(i)] ?? []).map((b) => `${b.start}-${b.end}`).join(", ") || "none"}`).join("; ");
  const text = [
    `Now: ${DAYS[p.weekday]} ${p.date} ${String(Math.floor(p.minutes / 60)).padStart(2, "0")}:${String(p.minutes % 60).padStart(2, "0")} local time (time zone ${tz}, UTC offset ${offset(now, tz)}).`,
    `Wakes ${settings.wake}, sleeps ${settings.sleep}.`,
    `Free time: ${free}.`,
    `Active plans:${(plans ?? []).length ? "" : " none"}`,
    ...(plans ?? []).map((pl) => `- [${pl.kind}] ${pl.title}`),
  ].join("\n");
  return { text, plans: plans ?? [], now };
}

async function makeDraft(req: Request, claude: string): Promise<DraftT> {
  const ctx = await context();
  const parts = [prompt("plan-prompt.md"), ctx.text];
  if (req.draft && req.feedback) parts.push(`Previous draft:\n${JSON.stringify(req.draft)}`, `Changes they asked for:\n"""${req.feedback}"""`);
  parts.push(`Their request:\n"""${req.text}"""`);
  let draft: DraftT = (await runPlanner(parts.join("\n\n"), DraftForAI, { claude })).draft;

  if (draft.kind === "task" && new Date(draft.deadline) <= ctx.now) throw new Error("the deadline would be in the past. Say when it's due.");
  if (draft.kind === "command") {
    const title = draft.plan_title.toLowerCase();
    if (!ctx.plans.some((p) => p.title.toLowerCase() === title)) throw new Error(`there's no active plan called "${draft.plan_title}".`);
  }
  if (draft.kind === "skill") draft = { ...draft, resources: await findResources(draft, claude) };
  return Draft.parse(draft);
}

async function findResources(skill: SkillPlanT, claude: string) {
  const plan = {
    title: skill.title,
    stages: skill.stages.map((s, i) => ({ stage: i, name: s.name, milestones: s.milestones.map((m) => `${m.title}: ${m.topics.join(", ")}`) })),
    searches: skill.resource_queries,
  };
  const { resources } = await runPlanner(`${prompt("resources-prompt.md")}\n${JSON.stringify(plan, null, 2)}`, ResourceList, { web: true, claude });
  const fetcher = (url: string) =>
    fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Mozilla/5.0 (compatible; StrideLinkCheck/1.0)" } });
  const checked = await checkLinks(resources, fetcher);
  log(`Resources: ${checked.length} of ${resources.length} links load`);
  return checked.map((r) => ({ ...r, stage: Math.min(r.stage, skill.stages.length - 1) }));
}

async function makeQuiz(req: Request, claude: string) {
  const { data: plan } = await supabase.from("stride_plans").select("title, plan, milestone").eq("id", req.plan_id).single();
  if (!plan) throw new Error("the skill plan no longer exists.");
  const all = milestones(plan.plan as SkillPlanT);
  const m = all[Math.min(plan.milestone, all.length - 1)];
  return runPlanner(`${prompt("quiz-prompt.md")}\nSkill: ${plan.title}\nStage: ${m.stageName}\nMilestone: ${m.title}\nTopics: ${m.topics.join(", ")}`, Quiz, { claude });
}

async function weeklyReview(claude: string) {
  const settings = await loadSettings(supabase);
  const tz = settings.time_zone;
  const now = new Date();
  if (!reviewDue(now, tz)) return;
  const week = weekStartOf(now, tz);
  const { data: existing } = await supabase.from("stride_reviews").select("id").eq("week_start", week).maybeSingle();
  if (existing) return;

  const from = zoned(week, 0, tz);
  const [{ data: plans }, { data: items }, { data: quizzes }] = await Promise.all([
    supabase.from("stride_plans").select("id, kind, title, at_risk").eq("status", "active"),
    supabase.from("stride_items").select("plan_id, starts_at, status").gte("starts_at", new Date(from.getTime() - 60 * 86_400_000).toISOString()).lte("starts_at", now.toISOString()),
    supabase.from("stride_quiz_attempts").select("plan_id, score").gte("created_at", from.toISOString()),
  ]);
  const thisWeek = (items ?? []).filter((i) => new Date(i.starts_at) >= from);
  const stats = {
    done: thisWeek.filter((i) => i.status === "done").length,
    skipped: thisWeek.filter((i) => i.status === "skipped").length,
    missed: thisWeek.filter((i) => i.status === "missed").length,
    plans: (plans ?? []).map((p) => {
      const mine = thisWeek.filter((i) => i.plan_id === p.id);
      return {
        kind: p.kind,
        title: p.title,
        done: mine.filter((i) => i.status === "done").length,
        missed: mine.filter((i) => i.status === "missed").length,
        at_risk: p.at_risk,
        ...(p.kind === "habit"
          ? { streak: streak((items ?? []).filter((i) => i.plan_id === p.id).map((i) => ({ date: localParts(new Date(i.starts_at), tz).date, status: i.status })), localParts(now, tz).date) }
          : {}),
        quiz_scores: (quizzes ?? []).filter((q) => q.plan_id === p.id).map((q) => q.score),
      };
    }),
  };
  log("Writing the weekly review…");
  const review = await runPlanner(`${prompt("review-prompt.md")}\n${JSON.stringify(stats, null, 2)}`, WeeklyReviewDraft, { claude });
  const titles = new Set((plans ?? []).map((p) => p.title.toLowerCase()));
  const suggestions = review.suggestions.map((s) => (s.command && !titles.has(s.command.plan_title.toLowerCase()) ? { text: s.text } : s));
  await supabase.from("stride_reviews").insert({ week_start: week, stats, summary: review.summary, suggestions });
  await notifyOwner("Your weekly review is ready", `${stats.done} done this week.`, "/review");
}

/** Push to the owner's devices (the worker is signed in as the owner, so it can read their subscriptions). */
async function notifyOwner(title: string, body: string, url: string) {
  if (!process.env.VAPID_PRIVATE_KEY) return;
  const { data: subs } = await supabase.from("stride_push_subscriptions").select("endpoint, p256dh, auth");
  const rows: DueRow[] = (subs ?? []).map((s) => ({ kind: "test", title, body, url, item_id: null, ...s }));
  const { gone } = await deliver(rows, sendPush);
  if (gone.length) await supabase.from("stride_push_subscriptions").delete().in("endpoint", gone);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
