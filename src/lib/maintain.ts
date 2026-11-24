// Keeps the schedule fresh: marks missed items, reschedules unfinished task steps, fills the next two weeks of habits
// and study sessions, applies the weekly habit check and quiets reminders that keep being ignored.
// planMaintenance() is pure; maintain() loads and saves.
import type { SupabaseClient } from "@supabase/supabase-js";
import { adaptTime, missedInARow, weeklyLevel } from "./habits";
import { itemsFor, type PlanDraft } from "./plans";
import { DEFAULT_FREE_BLOCKS, type FreeBlocks, type Slot } from "./schedule";
import { addDays, localParts, toMinutes } from "./time";

export interface PlanRow {
  id: string;
  kind: "task" | "habit" | "skill";
  title: string;
  status: "active" | "paused" | "done" | "archived";
  plan: PlanDraft;
  level: number;
  milestone: number;
  at_risk: boolean;
  remind: boolean;
  level_checked_at: string;
}

export interface ItemRow {
  id: string;
  plan_id: string | null;
  title: string;
  starts_at: string;
  minutes: number;
  status: "planned" | "done" | "skipped" | "missed";
  step: number | null;
  notified_at: string | null;
  done_at: string | null;
}

export interface NewItemRow {
  plan_id: string;
  title: string;
  starts_at: string;
  minutes: number;
  step: number | null;
}

export interface MaintenanceState {
  now: Date;
  tz: string;
  blocks: FreeBlocks;
  plans: PlanRow[];
  items: ItemRow[];
}

export interface Maintenance {
  insert: NewItemRow[];
  markMissed: string[];
  update: { id: string; patch: Partial<Pick<PlanRow, "status" | "level" | "at_risk" | "remind">> & Record<string, unknown> }[];
  retitle: { id: string; title: string }[];
}

const DAY = 86_400_000;
const DAYS_AHEAD = 14;
const end = (i: { starts_at: string; minutes: number }) => new Date(i.starts_at).getTime() + i.minutes * 60_000;
const mondayOf = (date: string, weekday: number) => addDays(date, -((weekday + 6) % 7));

export function planMaintenance(state: MaintenanceState): Maintenance {
  const { now, tz, blocks } = state;
  const out: Maintenance = { insert: [], markMissed: [], update: [], retitle: [] };

  const items = state.items.map((i) => {
    if (i.status === "planned" && end(i) < now.getTime()) {
      out.markMissed.push(i.id);
      return { ...i, status: "missed" as const };
    }
    return i;
  });
  const busy: Slot[] = items
    .filter((i) => i.status === "planned")
    .map((i) => ({ start: new Date(i.starts_at), end: new Date(end(i)) }));
  const add = (planId: string, generated: { title: string; starts_at: Date; minutes: number; step?: number }[]) => {
    for (const g of generated) {
      out.insert.push({ plan_id: planId, title: g.title, starts_at: g.starts_at.toISOString(), minutes: g.minutes, step: g.step ?? null });
      busy.push({ start: g.starts_at, end: new Date(g.starts_at.getTime() + g.minutes * 60_000) });
    }
  };

  for (const plan of state.plans) {
    if (plan.status !== "active") continue;
    const own = items.filter((i) => i.plan_id === plan.id);
    const patch: Maintenance["update"][number]["patch"] = {};
    const ctx = { now, tz, blocks, busy, days: DAYS_AHEAD };

    // Reminders ignored 5 times in a row (nothing done within 2 hours) move into the morning brief.
    const notified = own.filter((i) => i.notified_at).sort((a, b) => b.notified_at!.localeCompare(a.notified_at!)).slice(0, 5);
    const acted = (i: ItemRow) => i.done_at && new Date(i.done_at).getTime() - new Date(i.notified_at!).getTime() <= 2 * 3_600_000;
    if (plan.remind && notified.length === 5 && !notified.some(acted)) patch.remind = false;

    if (plan.plan.kind === "task") {
      const finished = new Set(own.filter((i) => i.status === "done" || i.status === "skipped").map((i) => i.step));
      const scheduled = new Set(own.filter((i) => i.status === "planned").map((i) => i.step));
      const steps = plan.plan.steps.map((_, s) => s);
      if (steps.every((s) => finished.has(s))) {
        Object.assign(patch, { status: "done", at_risk: false });
      } else {
        const remaining = steps.filter((s) => !finished.has(s) && !scheduled.has(s));
        if (remaining.length > 0) {
          const { items: placed, unplaced } = itemsFor(plan, { ...ctx, doneSteps: steps.filter((s) => !remaining.includes(s)) });
          add(plan.id, placed);
          if (unplaced.length > 0 !== plan.at_risk) patch.at_risk = unplaced.length > 0;
        }
      }
    } else if (plan.plan.kind === "habit") {
      const habit = plan.plan;
      let level = plan.level;
      if (now.getTime() - new Date(plan.level_checked_at).getTime() >= 7 * DAY) {
        const done = own.filter((i) => i.status === "done" && now.getTime() - new Date(i.starts_at).getTime() <= 7 * DAY).length;
        const r = weeklyLevel(level, done, habit.levels.length - 1);
        level = r.level;
        Object.assign(patch, { level, level_offer: r.offerUp, level_note: r.note, level_checked_at: now.toISOString() });
      }
      const past = own.filter((i) => new Date(i.starts_at) < now).sort((a, b) => b.starts_at.localeCompare(a.starts_at));
      const useMinimum = missedInARow(past.map((i) => i.status)) >= 2;
      const preferred = adaptTime(
        own.filter((i) => i.done_at).map((i) => localParts(new Date(i.done_at!), tz).minutes),
        { start: toMinutes(habit.window.start), end: toMinutes(habit.window.end) },
        toMinutes(habit.window.start),
      );
      const taken = new Set(own.map((i) => localParts(new Date(i.starts_at), tz).date));
      const missing = itemsFor({ ...plan, level }, { ...ctx, preferred }).items.filter((g) => !taken.has(localParts(g.starts_at, tz).date));
      // After two misses in a row, the next session is the easy minimum version.
      const next = own.filter((i) => i.status === "planned").sort((a, b) => a.starts_at.localeCompare(b.starts_at))[0];
      if (useMinimum && next && next.title !== habit.minimum) out.retitle.push({ id: next.id, title: habit.minimum });
      if (useMinimum && !next && missing[0]) missing[0] = { ...missing[0], title: habit.minimum };
      add(plan.id, missing);
    } else {
      const weekOf = (iso: string) => {
        const p = localParts(new Date(iso), tz);
        return mondayOf(p.date, p.weekday);
      };
      const taken = new Set(own.map((i) => weekOf(i.starts_at)));
      add(plan.id, itemsFor(plan, ctx).items.filter((g) => !taken.has(weekOf(g.starts_at.toISOString()))));
    }

    if (Object.keys(patch).length > 0) out.update.push({ id: plan.id, patch });
  }
  return out;
}

const ITEM_FIELDS = "id, plan_id, title, starts_at, minutes, status, step, notified_at, done_at";
const PLAN_FIELDS = "id, kind, title, status, plan, level, milestone, at_risk, remind, level_checked_at";

export interface Settings {
  time_zone: string;
  wake: string;
  sleep: string;
  quiet_start: string;
  quiet_end: string;
  daily_cap: number;
  free_blocks: FreeBlocks;
  maintained_at: string | null;
  calendar_token_hash: string | null;
}

const DEFAULT_SETTINGS: Settings = {
  time_zone: "Africa/Lagos",
  wake: "06:00",
  sleep: "22:30",
  quiet_start: "22:30",
  quiet_end: "06:30",
  daily_cap: 8,
  free_blocks: DEFAULT_FREE_BLOCKS,
  maintained_at: null,
  calendar_token_hash: null,
};

/** The user's settings row, created with the defaults the first time. */
export async function loadSettings(supabase: SupabaseClient): Promise<Settings> {
  await supabase.from("stride_settings").upsert({}, { onConflict: "user_id", ignoreDuplicates: true });
  const { data } = await supabase.from("stride_settings").select(Object.keys(DEFAULT_SETTINGS).join(", ")).single();
  return { ...DEFAULT_SETTINGS, ...((data ?? {}) as Partial<Settings>) };
}

/** Loads the signed-in user's plans and items, applies planMaintenance and saves the result. */
export async function maintain(supabase: SupabaseClient, now = new Date()): Promise<Maintenance> {
  const settings = await loadSettings(supabase);
  const [{ data: plans }, { data: items }] = await Promise.all([
    supabase.from("stride_plans").select(PLAN_FIELDS).eq("status", "active"),
    supabase
      .from("stride_items")
      .select(ITEM_FIELDS)
      .not("plan_id", "is", null)
      .gte("starts_at", new Date(now.getTime() - 60 * DAY).toISOString()),
  ]);
  const out = planMaintenance({ now, tz: settings.time_zone, blocks: settings.free_blocks, plans: (plans ?? []) as PlanRow[], items: (items ?? []) as ItemRow[] });

  if (out.markMissed.length > 0) await supabase.from("stride_items").update({ status: "missed" }).in("id", out.markMissed).eq("status", "planned");
  if (out.insert.length > 0) await supabase.from("stride_items").upsert(out.insert, { onConflict: "plan_id,starts_at", ignoreDuplicates: true });
  for (const u of out.update) await supabase.from("stride_plans").update(u.patch).eq("id", u.id);
  for (const r of out.retitle) await supabase.from("stride_items").update({ title: r.title }).eq("id", r.id);
  await supabase.from("stride_settings").update({ maintained_at: now.toISOString() }).not("user_id", "is", null);
  return out;
}
