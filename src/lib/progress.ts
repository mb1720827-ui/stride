import { streak } from "./habits";
import { milestones, type PlanDraft } from "./plans";
import { addDays, formatLocal, localParts } from "./time";

export type ProgressItem = { plan_id: string; starts_at: string; status: "planned" | "done" | "skipped" | "missed"; step: number | null };
type State = ProgressItem["status"];

/** One line of progress for a plan, from its items. */
export function progress(plan: { kind: string; plan: PlanDraft; level: number; milestone: number }, items: ProgressItem[], tz: string, now: Date): string {
  const p = plan.plan;
  if (p.kind === "task") {
    const done = new Set(items.filter((i) => i.status === "done" || i.status === "skipped").map((i) => i.step)).size;
    return `${done} of ${p.steps.length} ${p.steps.length === 1 ? "step" : "steps"} ∙ due ${formatLocal(new Date(p.deadline), tz)}`;
  }
  if (p.kind === "habit") {
    const days = items.map((i) => ({ date: localParts(new Date(i.starts_at), tz).date, status: i.status }));
    const past = items.filter((i) => i.status !== "planned");
    const pct = past.length ? Math.round((100 * past.filter((i) => i.status === "done").length) / past.length) : 0;
    return `${streak(days, localParts(now, tz).date)}-day streak ∙ level ${plan.level + 1} of ${p.levels.length} ∙ ${pct}% done in the last 30 days`;
  }
  if (p.kind === "skill") {
    const all = milestones(p);
    return `Milestone ${Math.min(plan.milestone, all.length - 1) + 1} of ${all.length}: ${all[Math.min(plan.milestone, all.length - 1)].title}`;
  }
  return "";
}

/** The stops of a plan's short route: one per task step, per day of the last week (habits) or per milestone (skills). */
export function routeStops(plan: { plan: PlanDraft; milestone: number }, items: ProgressItem[], tz: string, now: Date): State[] {
  const p = plan.plan;
  if (p.kind === "task") {
    return p.steps.map((_, step) => {
      const mine = items.filter((i) => i.step === step);
      if (mine.some((i) => i.status === "done")) return "done";
      if (mine.some((i) => i.status === "skipped")) return "skipped";
      if (mine.some((i) => i.status === "planned")) return "planned";
      return mine.length ? "missed" : "planned";
    });
  }
  if (p.kind === "habit") {
    const today = localParts(now, tz).date;
    return Array.from({ length: 7 }, (_, k) => {
      const date = addDays(today, k - 6);
      const day = items.filter((i) => localParts(new Date(i.starts_at), tz).date === date);
      if (day.some((i) => i.status === "done")) return "done";
      if (day.some((i) => i.status === "skipped")) return "skipped";
      if (day.some((i) => i.status === "missed")) return "missed";
      return "planned";
    });
  }
  if (p.kind === "skill") return milestones(p).map((_, i) => (i < plan.milestone ? "done" : "planned"));
  return [];
}
