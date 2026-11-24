// Saving an accepted plan (from the AI or Quick add) and applying chat commands. Runs with the user's own session.
import type { SupabaseClient } from "@supabase/supabase-js";
import { loadSettings, maintain } from "./maintain";
import { itemsFor, type DraftT, type PlanDraft } from "./plans";

const futurePlanned = (supabase: SupabaseClient, planId: string, now: Date) =>
  supabase.from("stride_items").delete().eq("plan_id", planId).eq("status", "planned").gt("starts_at", now.toISOString());

/** Saves a plan and schedules its first two weeks (or a task's steps). Returns the new plan's id. */
export async function createPlan(supabase: SupabaseClient, draft: PlanDraft, now = new Date()): Promise<string> {
  const settings = await loadSettings(supabase);
  const { data: upcoming } = await supabase.from("stride_items").select("starts_at, minutes").eq("status", "planned").gte("starts_at", now.toISOString());
  const busy = (upcoming ?? []).map((i) => ({ start: new Date(i.starts_at), end: new Date(new Date(i.starts_at).getTime() + i.minutes * 60_000) }));

  const { resources, ...plan } = draft.kind === "skill" ? draft : { ...draft, resources: undefined };
  const { data: row, error } = await supabase
    .from("stride_plans")
    .insert({ kind: draft.kind, title: draft.title, plan, deadline: draft.kind === "task" ? draft.deadline : null })
    .select("id")
    .single();
  if (error || !row) throw new Error(`Couldn't save the plan: ${error?.message ?? "no row"}`);

  const { items, unplaced } = itemsFor(
    { kind: draft.kind, title: draft.title, plan: draft, level: 0, milestone: 0 },
    { now, tz: settings.time_zone, blocks: settings.free_blocks, busy, days: 14 },
  );
  if (items.length > 0) {
    await supabase.from("stride_items").insert(
      items.map((i) => ({ plan_id: row.id, title: i.title, starts_at: i.starts_at.toISOString(), minutes: i.minutes, step: i.step ?? null })),
    );
  }
  if (unplaced.length > 0) await supabase.from("stride_plans").update({ at_risk: true }).eq("id", row.id);
  if (resources?.length) {
    await supabase.from("stride_resources").insert(
      resources.map((r) => ({
        plan_id: row.id,
        stage: r.stage,
        title: r.title,
        url: r.url,
        type: r.type,
        free: r.free,
        reason: r.reason,
        takeaway_item_id: r.takeaway_item_id ?? null,
        checked_at: now.toISOString(),
      })),
    );
  }
  return row.id;
}

/** Pauses, finishes or archives a plan (removing its upcoming items), or makes it active again. */
export async function setStatus(supabase: SupabaseClient, planId: string, status: "active" | "paused" | "done" | "archived", now = new Date()) {
  await supabase.from("stride_plans").update({ status }).eq("id", planId);
  if (status === "active") await maintain(supabase, now);
  else await futurePlanned(supabase, planId, now);
}

/** Applies a chat command such as "move my reading to 8pm". Returns an error message, or null when done. */
export async function applyCommand(supabase: SupabaseClient, cmd: Extract<DraftT, { kind: "command" }>, now = new Date()): Promise<string | null> {
  const { data: plans } = await supabase.from("stride_plans").select("id, kind, title, plan, status").in("status", ["active", "paused"]);
  const plan = (plans ?? []).find((p) => p.title.toLowerCase() === cmd.plan_title.toLowerCase());
  if (!plan) return `No plan called "${cmd.plan_title}".`;

  if (cmd.action === "move") {
    if (plan.kind !== "habit" || !cmd.time) return "Only habits can be moved to a new daily time. Edit task steps on the plan page.";
    const habit = plan.plan as Extract<PlanDraft, { kind: "habit" }>;
    const end = habit.window.end > cmd.time ? habit.window.end : cmd.time;
    await supabase.from("stride_plans").update({ plan: { ...habit, window: { start: cmd.time, end } } }).eq("id", plan.id);
    await futurePlanned(supabase, plan.id, now);
    await maintain(supabase, now);
    return null;
  }
  const status = { pause: "paused", resume: "active", done: "done", archive: "archived" } as const;
  await setStatus(supabase, plan.id, status[cmd.action], now);
  return null;
}

/** Renames a plan's upcoming items, e.g. after a level up or a new skill milestone. */
export async function retitleUpcoming(supabase: SupabaseClient, planId: string, title: string, now = new Date()) {
  await supabase.from("stride_items").update({ title }).eq("plan_id", planId).eq("status", "planned").gt("starts_at", now.toISOString());
}
