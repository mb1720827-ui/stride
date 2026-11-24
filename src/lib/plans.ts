// The shapes the AI drafts (validated with Zod before anything is saved) and how an accepted plan becomes scheduled items.
import { z } from "zod";
import { freeSlots, placeDaily, placeSteps, placeWeekly, type FreeBlocks, type Slot } from "./schedule";
import { addDays, localParts, toMinutes } from "./time";

const HHMM = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "use 24-hour HH:MM");
const Title = z.string().trim().min(1).max(200);

export const TaskPlan = z.object({
  kind: z.literal("task"),
  title: Title,
  deadline: z.iso.datetime({ offset: true }).describe("ISO 8601 with time zone offset"),
  steps: z
    .array(z.object({ title: Title, minutes: z.number().int().min(5).max(240), optional: z.boolean() }))
    .min(1)
    .max(20),
});

export const HabitPlan = z.object({
  kind: z.literal("habit"),
  title: Title,
  levels: z
    .array(z.object({ amount: z.number().positive(), unit: z.string().min(1).max(40), label: Title.describe('e.g. "Read 15 pages"') }))
    .min(3)
    .max(5),
  minimum: Title.describe('the smallest version for bad days, e.g. "Read 1 page"'),
  window: z.object({ start: HHMM, end: HHMM }),
  trigger: z.string().min(1).max(200),
  recovery: z.string().min(1).max(500),
  minutes: z.number().int().min(2).max(180),
});

export const Resource = z.object({
  stage: z.number().int().min(0),
  title: Title,
  url: z.url(),
  type: z.enum(["book", "course", "video", "article", "exercise", "project"]),
  free: z.boolean(),
  reason: z.string().min(1).max(300),
  takeaway_item_id: z.uuid().nullable().optional(),
});
export type ResourceT = z.infer<typeof Resource>;

export const SkillPlan = z.object({
  kind: z.literal("skill"),
  title: Title,
  stages: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        milestones: z
          .array(z.object({ title: Title, weeks: z.number().int().min(1).max(12), topics: z.array(z.string().min(1).max(120)).min(1).max(8) }))
          .min(1)
          .max(6),
      }),
    )
    .min(2)
    .max(5),
  sessions_per_week: z.number().int().min(1).max(7),
  minutes: z.number().int().min(15).max(180),
  resource_queries: z.array(z.object({ stage: z.number().int().min(0), query: z.string().min(3).max(200) })).max(10),
  /** Filled in by the worker after it has checked every link; the drafting step leaves it out. */
  resources: z.array(Resource).max(15).optional(),
});
export type SkillPlanT = z.infer<typeof SkillPlan>;

export const CommandPlan = z.object({
  kind: z.literal("command"),
  action: z.enum(["move", "pause", "resume", "done", "archive"]),
  plan_title: Title.describe("the exact title of one of the user's active plans"),
  time: HHMM.optional().describe("new daily time, for move"),
  summary: z.string().min(1).max(200).describe('what will happen, e.g. "Move Read 15 pages to 20:00 every day"'),
});

export const Draft = z.discriminatedUnion("kind", [TaskPlan, HabitPlan, SkillPlan, CommandPlan]);
export type DraftT = z.infer<typeof Draft>;
export type PlanDraft = Exclude<DraftT, { kind: "command" }>;

export const Quiz = z.object({
  questions: z
    .array(z.object({ q: z.string().min(5).max(500), options: z.array(z.string().min(1).max(200)).length(4), answer: z.number().int().min(0).max(3), why: z.string().min(1).max(400) }))
    .length(5),
});
export type QuizT = z.infer<typeof Quiz>;

export const WeeklyReviewDraft = z.object({
  summary: z.string().min(1).max(1500),
  suggestions: z.array(z.object({ text: z.string().min(1).max(300), command: CommandPlan.optional() })).max(3),
});

export const ResourceList = z.object({ resources: z.array(Resource.omit({ takeaway_item_id: true })).max(12) });

/** Every milestone of a skill in order, so `plans.milestone` can be a single number. */
export const milestones = (skill: SkillPlanT) => skill.stages.flatMap((s, stage) => s.milestones.map((m) => ({ ...m, stage, stageName: s.name })));

export interface NewItem {
  title: string;
  starts_at: Date;
  minutes: number;
  step?: number;
}

export interface ItemsContext {
  now: Date;
  tz: string;
  blocks: FreeBlocks;
  busy: Slot[];
  /** How many days ahead to fill for habits and skills. */
  days: number;
  /** Task steps already done; their step numbers are kept for the rest. */
  doneSteps?: number[];
  /** Use the habit's minimum version for the first item (after two misses in a row). */
  useMinimum?: boolean;
  /** Habit time in minutes after midnight, when it has adapted to when you really do it. */
  preferred?: number;
}

/** Turns an accepted plan into scheduled items. Tasks also report steps that don't fit before the deadline. */
export function itemsFor(
  plan: { kind: PlanDraft["kind"]; title: string; plan: PlanDraft; level: number; milestone: number },
  ctx: ItemsContext,
): { items: NewItem[]; unplaced: number[] } {
  const p = plan.plan;
  const today = localParts(ctx.now, ctx.tz).date;
  const horizon = new Date(ctx.now.getTime() + ctx.days * 86_400_000);

  if (p.kind === "task") {
    const remaining = p.steps.map((s, step) => ({ ...s, step })).filter((s) => !ctx.doneSteps?.includes(s.step));
    const deadline = new Date(p.deadline);
    const { placed, unplaced } = placeSteps(remaining, freeSlots(ctx.blocks, ctx.tz, ctx.now, deadline, ctx.busy), deadline, ctx.now);
    return {
      items: placed.map((x) => ({ title: x.title, starts_at: x.starts_at, minutes: x.minutes, step: remaining[x.step].step })),
      unplaced: unplaced.map((i) => remaining[i].step),
    };
  }

  if (p.kind === "habit") {
    const preferred = ctx.preferred ?? toMinutes(p.window.start);
    const days = Array.from({ length: ctx.days + 1 }, (_, i) => addDays(today, i));
    const starts = placeDaily(days, p.minutes, ctx.tz, ctx.blocks, preferred, ctx.busy).filter((s) => s > ctx.now).slice(0, ctx.days);
    const label = p.levels[Math.min(plan.level, p.levels.length - 1)].label;
    return { items: starts.map((s, i) => ({ title: i === 0 && ctx.useMinimum ? p.minimum : label, starts_at: s, minutes: p.minutes })), unplaced: [] };
  }

  const all = milestones(p);
  const current = all[Math.min(plan.milestone, all.length - 1)];
  const { weekday } = localParts(ctx.now, ctx.tz);
  const items: NewItem[] = [];
  for (let week = addDays(today, -((weekday + 6) % 7)); week <= localParts(horizon, ctx.tz).date; week = addDays(week, 7)) {
    const busy = [...ctx.busy, ...items.map((i) => ({ start: i.starts_at, end: new Date(i.starts_at.getTime() + i.minutes * 60_000) }))];
    for (const s of placeWeekly(week, p.sessions_per_week, p.minutes, ctx.tz, ctx.blocks, busy, ctx.now)) {
      if (s <= horizon) items.push({ title: `${plan.title}: ${current.title}`, starts_at: s, minutes: p.minutes });
    }
  }
  return { items, unplaced: [] };
}
