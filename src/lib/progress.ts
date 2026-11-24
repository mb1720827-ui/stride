import { streak } from "./habits";
import { milestones, type PlanDraft } from "./plans";
import { formatLocal, localParts } from "./time";

export type ProgressItem = { plan_id: string; starts_at: string; status: "planned" | "done" | "skipped" | "missed"; step: number | null };

/** One line of progress for a plan, from its items. */
export function progress(plan: { kind: string; plan: PlanDraft; level: number; milestone: number }, items: ProgressItem[], tz: string, now: Date): string {
  const p = plan.plan;
  if (p.kind === "task") {
    const done = new Set(items.filter((i) => i.status === "done" || i.status === "skipped").map((i) => i.step)).size;
    return `${done} of ${p.steps.length} steps · due ${formatLocal(new Date(p.deadline), tz)}`;
  }
  if (p.kind === "habit") {
    const days = items.map((i) => ({ date: localParts(new Date(i.starts_at), tz).date, status: i.status }));
    const past = items.filter((i) => i.status !== "planned");
    const pct = past.length ? Math.round((100 * past.filter((i) => i.status === "done").length) / past.length) : 0;
    return `${streak(days, localParts(now, tz).date)}-day streak · level ${plan.level + 1} of ${p.levels.length} · ${pct}% done in the last 30 days`;
  }
  if (p.kind === "skill") {
    const all = milestones(p);
    return `Milestone ${Math.min(plan.milestone, all.length - 1) + 1} of ${all.length}: ${all[Math.min(plan.milestone, all.length - 1)].title}`;
  }
  return "";
}
