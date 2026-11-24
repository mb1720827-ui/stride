"use server";

import { createHash, randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aiFor } from "@/lib/auth";
import { applyCommand, createPlan, retitleUpcoming, setStatus } from "@/lib/create-plan";
import { loadSettings, maintain } from "@/lib/maintain";
import { Draft, milestones, Quiz, type PlanDraft, type SkillPlanT } from "@/lib/plans";
import { isPushEndpoint, sendPush, type DueRow } from "@/lib/push";
import { freeSlots } from "@/lib/schedule";
import { addDays, localParts, toMinutes, zoned } from "@/lib/time";
import { createClient } from "@/lib/supabase/server";

export interface FormState {
  error?: string;
  message?: string;
  /** What the user typed, so a failed submit doesn't wipe the field (React resets forms after actions). */
  value?: string;
}

const Id = z.uuid();
const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

export async function authenticate(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) return { error: "Enter your email and a password of at least 8 characters.", value: email };
  const supabase = await createClient();
  if (formData.get("intent") === "signup") {
    const origin = (await headers()).get("origin") ?? "";
    const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${origin}/auth/callback` } });
    if (error) return { error: error.message, value: email };
    if (!data.session) return { message: "Check your email and click the link to confirm your account.", value: email };
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message, value: email };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

// ---------- Chat requests ----------

export async function sendRequest(_prev: FormState, formData: FormData): Promise<FormState> {
  const text = String(formData.get("text") ?? "").trim();
  if (text.length < 3) return { error: "Type what you want to do, for example “finish my report by Friday”.", value: text };
  if (text.length > 1000) return { error: "Keep it under 1,000 characters.", value: text };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The worker only ever sees the owner's rows; this just saves other accounts from a request that would never run.
  if (!aiFor(user?.email)) return { error: "AI planning only runs on the owner's copy for now. Use Quick add.", value: text };
  const { error } = await supabase.from("stride_requests").insert({ text });
  if (error) return { error: "Couldn't send that. Are you signed in?", value: text };
  revalidatePath("/");
  return { message: "Got it. Your plan is being drafted." };
}

export async function acceptRequest(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const supabase = await createClient();
  const { data: req } = await supabase.from("stride_requests").select("id, status, kind, draft").eq("id", id).single();
  if (!req || req.status !== "ready") redirect(`/requests/${id}`);
  const draft = Draft.parse(req.draft);
  let planId: string | null = null;
  if (draft.kind === "command") {
    const error = await applyCommand(supabase, draft);
    if (error) {
      await supabase.from("stride_requests").update({ status: "failed", error }).eq("id", id);
      redirect(`/requests/${id}`);
    }
  } else {
    planId = await createPlan(supabase, draft);
  }
  await supabase.from("stride_requests").update({ status: "accepted", plan_id: planId, updated_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/", "layout");
  redirect(planId ? `/plans/${planId}` : "/");
}

export async function changeRequest(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const feedback = z.string().trim().max(1000).parse(formData.get("feedback") ?? "");
  const supabase = await createClient();
  await supabase
    .from("stride_requests")
    .update({ status: "queued", feedback: feedback || null, error: null, attempts: 0, updated_at: new Date().toISOString() })
    .eq("id", id)
    .in("status", ["ready", "failed"]);
  revalidatePath("/", "layout");
  redirect(`/requests/${id}`);
}

export async function discardRequest(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("stride_requests").update({ status: "discarded" }).eq("id", id);
  revalidatePath("/", "layout");
  redirect("/");
}

// ---------- Items and plans ----------

export async function setItemStatus(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const status = z.enum(["done", "skipped", "planned"]).parse(formData.get("status"));
  const supabase = await createClient();
  await supabase.from("stride_items").update({ status, done_at: status === "done" ? new Date().toISOString() : null }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function setPlanStatus(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const status = z.enum(["active", "paused", "done", "archived"]).parse(formData.get("status"));
  const supabase = await createClient();
  await setStatus(supabase, id, status);
  revalidatePath("/", "layout");
}

export async function setRemind(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("stride_plans").update({ remind: formData.get("remind") === "on" }).eq("id", id);
  revalidatePath("/", "layout");
}

export async function answerLevelOffer(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const supabase = await createClient();
  const { data: plan } = await supabase.from("stride_plans").select("level, plan").eq("id", id).single();
  if (!plan) return;
  const levels = (plan.plan as Extract<PlanDraft, { kind: "habit" }>).levels;
  if (formData.get("answer") === "yes" && plan.level < levels.length - 1) {
    await supabase.from("stride_plans").update({ level: plan.level + 1, level_offer: false, level_note: null }).eq("id", id);
    await retitleUpcoming(supabase, id, levels[plan.level + 1].label);
  } else {
    await supabase.from("stride_plans").update({ level_offer: false }).eq("id", id);
  }
  revalidatePath("/", "layout");
}

const QuickAdd = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("task"), title: z.string().trim().min(1).max(200), deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/), minutes: z.coerce.number().int().min(5).max(600) }),
  z.object({ kind: z.literal("habit"), title: z.string().trim().min(1).max(200), time: HHMM, minutes: z.coerce.number().int().min(2).max(180) }),
]);

/** Adds a task or habit without the AI (works with the laptop off, and for everyone). */
export async function quickAdd(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = QuickAdd.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Fill in every field." };
  const supabase = await createClient();
  const settings = await loadSettings(supabase);
  const q = parsed.data;
  let draft: PlanDraft;
  if (q.kind === "task") {
    const [date, time] = q.deadline.split("T");
    const deadline = zoned(date, toMinutes(time), settings.time_zone);
    if (deadline <= new Date()) return { error: "Pick a deadline in the future." };
    draft = { kind: "task", title: q.title, deadline: deadline.toISOString(), steps: [{ title: q.title, minutes: q.minutes, optional: false }] };
  } else {
    const end = Math.min(toMinutes(q.time) + 120, 23 * 60 + 59);
    const level = { amount: q.minutes, unit: "minutes", label: q.title };
    draft = {
      kind: "habit",
      title: q.title,
      levels: [level, level, level],
      minimum: `${q.title} (just 2 minutes)`,
      window: { start: q.time, end: `${String(Math.floor(end / 60)).padStart(2, "0")}:${String(end % 60).padStart(2, "0")}` },
      trigger: `At ${q.time}`,
      recovery: "Never miss twice: on a bad day, do just 2 minutes.",
      minutes: q.minutes,
    };
  }
  await createPlan(supabase, draft);
  revalidatePath("/", "layout");
  return { message: `Added “${q.title}”.` };
}

// ---------- Settings ----------

/** "18:00-22:00, 06:00-07:00" -> blocks; "" -> no free time that day. */
function parseBlocks(text: string): { start: string; end: string }[] | null {
  const blocks = [];
  for (const part of text.split(",").map((p) => p.trim()).filter(Boolean)) {
    const m = /^([01]\d|2[0-3]):([0-5]\d)\s*-\s*([01]\d|2[0-3]):([0-5]\d)$/.exec(part);
    if (!m) return null;
    const start = `${m[1]}:${m[2]}`;
    const end = `${m[3]}:${m[4]}`;
    if (end <= start) return null;
    blocks.push({ start, end });
  }
  return blocks;
}

export async function saveSettings(_prev: FormState, formData: FormData): Promise<FormState> {
  const tz = String(formData.get("time_zone") ?? "");
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    return { error: `“${tz}” isn't a time zone. Use a name like Africa/Lagos.` };
  }
  const times = z
    .object({ wake: HHMM, sleep: HHMM, quiet_start: HHMM, quiet_end: HHMM, daily_cap: z.coerce.number().int().min(2).max(20) })
    .safeParse(Object.fromEntries(formData));
  if (!times.success) return { error: "Use 24-hour times like 06:30, and a daily limit from 2 to 20." };
  const free_blocks: Record<string, { start: string; end: string }[]> = {};
  for (let d = 0; d < 7; d++) {
    const blocks = parseBlocks(String(formData.get(`free_${d}`) ?? ""));
    if (!blocks) return { error: "Write free time like 18:00-22:00, separated by commas." };
    free_blocks[String(d)] = blocks;
  }
  const supabase = await createClient();
  await loadSettings(supabase);
  const { error } = await supabase.from("stride_settings").update({ time_zone: tz, ...times.data, free_blocks }).not("user_id", "is", null);
  if (error) return { error: "Couldn't save. Are you signed in?" };
  revalidatePath("/", "layout");
  return { message: "Saved. New plans use these times." };
}

// ---------- Skill quizzes ----------

export async function requestQuiz(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!aiFor(user?.email)) redirect(`/plans/${id}`);
  const { data: plan } = await supabase.from("stride_plans").select("title, plan, milestone").eq("id", id).single();
  if (!plan) return;
  const all = milestones(plan.plan as SkillPlanT);
  const m = all[Math.min(plan.milestone, all.length - 1)];
  const { data: req } = await supabase
    .from("stride_requests")
    .insert({ text: `Quiz: ${plan.title}, ${m.title}`, kind: "quiz", plan_id: id })
    .select("id")
    .single();
  redirect(req ? `/requests/${req.id}` : `/plans/${id}`);
}

export async function submitQuiz(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const supabase = await createClient();
  const { data: req } = await supabase.from("stride_requests").select("plan_id, draft, status").eq("id", id).single();
  if (!req?.plan_id || req.status !== "ready") redirect("/");
  const quiz = Quiz.parse(req.draft);
  const answers = quiz.questions.map((_, i) => Number(formData.get(`q${i}`) ?? -1));
  const score = quiz.questions.filter((q, i) => q.answer === answers[i]).length;
  const { data: plan } = await supabase.from("stride_plans").select("title, plan, milestone").eq("id", req.plan_id).single();
  if (!plan) redirect("/");
  await supabase.from("stride_quiz_attempts").insert({ plan_id: req.plan_id, milestone: plan.milestone, questions: quiz, answers, score });
  await supabase.from("stride_requests").update({ status: "accepted" }).eq("id", id);

  const all = milestones(plan.plan as SkillPlanT);
  if (score >= 4) {
    if (plan.milestone + 1 >= all.length) {
      await supabase.from("stride_plans").update({ milestone: all.length - 1 }).eq("id", req.plan_id);
      await setStatus(supabase, req.plan_id, "done");
    } else {
      await supabase.from("stride_plans").update({ milestone: plan.milestone + 1 }).eq("id", req.plan_id);
      await retitleUpcoming(supabase, req.plan_id, `${plan.title}: ${all[plan.milestone + 1].title}`);
    }
  } else {
    // One extra review session tomorrow, in the first free time (18:00 if there's none).
    const settings = await loadSettings(supabase);
    const tomorrow = addDays(localParts(new Date(), settings.time_zone).date, 1);
    const slot = freeSlots(settings.free_blocks, settings.time_zone, zoned(tomorrow, 0, settings.time_zone), zoned(tomorrow, 23 * 60 + 59, settings.time_zone), [])[0];
    await supabase.from("stride_items").upsert(
      {
        plan_id: req.plan_id,
        title: `Review: ${all[Math.min(plan.milestone, all.length - 1)].title}`,
        starts_at: (slot?.start ?? zoned(tomorrow, 18 * 60, settings.time_zone)).toISOString(),
        minutes: 30,
      },
      { onConflict: "plan_id,starts_at", ignoreDuplicates: true },
    );
  }
  revalidatePath("/", "layout");
  redirect(`/plans/${req.plan_id}?quiz=${score}`);
}

/** Turns a weekly-review suggestion into a command the user can review and accept. */
export async function applySuggestion(formData: FormData) {
  const command = Draft.parse(JSON.parse(String(formData.get("command") ?? "null")));
  if (command.kind !== "command") return;
  const supabase = await createClient();
  const { data: req } = await supabase
    .from("stride_requests")
    .insert({ text: command.summary, kind: "command", status: "ready", draft: command })
    .select("id")
    .single();
  redirect(req ? `/requests/${req.id}` : "/review");
}

/** For an at-risk task: push the deadline back and reschedule what's left. */
export async function extendDeadline(formData: FormData) {
  const id = Id.parse(formData.get("id"));
  const days = z.coerce.number().int().min(1).max(30).parse(formData.get("days"));
  const supabase = await createClient();
  const { data: plan } = await supabase.from("stride_plans").select("plan, deadline").eq("id", id).single();
  if (!plan?.deadline) return;
  const deadline = new Date(new Date(plan.deadline).getTime() + days * 86_400_000).toISOString();
  await supabase.from("stride_plans").update({ deadline, at_risk: false, plan: { ...(plan.plan as object), deadline } }).eq("id", id);
  // Re-place every unfinished step against the new deadline.
  await supabase.from("stride_items").delete().eq("plan_id", id).eq("status", "planned");
  await maintain(supabase);
  revalidatePath("/", "layout");
}

// ---------- Push notifications ----------

const Subscription = z.object({
  endpoint: z.string().max(1000).refine(isPushEndpoint, "not a browser push service"),
  p256dh: z.string().min(10).max(200),
  auth: z.string().min(8).max(100),
});

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<FormState> {
  const parsed = Subscription.safeParse(sub);
  if (!parsed.success) return { error: "That browser subscription looks wrong. Try again." };
  const supabase = await createClient();
  // A device belongs to whoever subscribed it last.
  await supabase.from("stride_push_subscriptions").delete().eq("endpoint", parsed.data.endpoint);
  const { error } = await supabase.from("stride_push_subscriptions").insert(parsed.data);
  return error ? { error: "Couldn't save. Are you signed in?" } : { message: "Notifications are on for this device." };
}

export async function deletePushSubscription(endpoint: string): Promise<FormState> {
  const supabase = await createClient();
  await supabase.from("stride_push_subscriptions").delete().eq("endpoint", endpoint);
  return { message: "Notifications are off for this device." };
}

export async function sendTestPush(): Promise<FormState> {
  const supabase = await createClient();
  const { data: subs } = await supabase.from("stride_push_subscriptions").select("endpoint, p256dh, auth");
  if (!subs?.length) return { error: "Turn on notifications first." };
  let sent = 0;
  for (const s of subs) {
    if (!isPushEndpoint(s.endpoint)) continue;
    const row: DueRow = { kind: "test", title: "Stride test", body: "Notifications work. Reminders will look like this.", url: "/", item_id: null, ...s };
    await sendPush(row).then(() => sent++).catch(() => undefined);
  }
  return sent ? { message: `Sent to ${sent} device${sent === 1 ? "" : "s"}.` } : { error: "The push service didn't accept it. Turn notifications off and on again." };
}

// ---------- Calendar feed ----------

/** A new private calendar token. Only its hash is stored, so the link is shown once; a new one replaces the old. */
export async function createCalendarToken(): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const supabase = await createClient();
  await loadSettings(supabase);
  await supabase.from("stride_settings").update({ calendar_token_hash: createHash("sha256").update(token).digest("hex") }).not("user_id", "is", null);
  return token;
}
