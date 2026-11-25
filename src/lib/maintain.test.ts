import { describe, expect, it } from "vitest";
import { planMaintenance, type ItemRow, type PlanRow } from "./maintain";
import { DEFAULT_FREE_BLOCKS } from "./schedule";
import { zoned } from "./time";

const TZ = "Africa/Lagos";
const at = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return zoned(date, h * 60 + m, TZ);
};

const taskPlan = (deadline: Date): PlanRow => ({
  id: "task-1",
  kind: "task",
  title: "Project report",
  status: "active",
  plan: {
    kind: "task",
    title: "Project report",
    deadline: deadline.toISOString(),
    steps: [
      { title: "Outline", minutes: 60, optional: false },
      { title: "Draft", minutes: 60, optional: false },
    ],
  },
  level: 0,
  milestone: 0,
  at_risk: false,
  remind: true,
  level_checked_at: at("2026-11-23", "12:00").toISOString(),
});

let n = 0;
const item = (patch: Partial<ItemRow>): ItemRow => ({
  id: `item-${++n}`,
  plan_id: "task-1",
  title: "Outline",
  starts_at: at("2026-11-23", "18:00").toISOString(),
  minutes: 60,
  status: "planned",
  step: 0,
  notified_at: null,
  done_at: null,
  ...patch,
});

/** Applies one run's output to the state, the way maintain() writes it to the database. */
function apply(items: ItemRow[], out: ReturnType<typeof planMaintenance>): ItemRow[] {
  const next = items.map((i) => (out.markMissed.includes(i.id) ? { ...i, status: "missed" as const } : i));
  for (const x of out.insert) next.push(item({ ...x, step: x.step ?? null }));
  return next;
}

describe("planMaintenance", () => {
  it("marks a step whose time has passed as missed and schedules it again", () => {
    const items = [item({ step: 0 }), item({ step: 1, title: "Draft", starts_at: at("2026-11-23", "19:00").toISOString() })];
    const out = planMaintenance({ now: at("2026-11-24", "08:00"), tz: TZ, blocks: DEFAULT_FREE_BLOCKS, plans: [taskPlan(at("2026-11-27", "22:00"))], items });
    expect(out.markMissed).toEqual([items[0].id, items[1].id]);
    expect(out.insert.map((i) => [i.step, i.starts_at])).toEqual([
      [0, at("2026-11-24", "18:00").toISOString()],
      [1, at("2026-11-24", "19:00").toISOString()],
    ]);
  });

  it("keeps task steps in order when a missed step is rescheduled before later ones", () => {
    const plan = taskPlan(at("2026-11-27", "22:00"));
    plan.plan = { ...plan.plan, steps: [...(plan.plan as { steps: { title: string; minutes: number; optional: boolean }[] }).steps, { title: "Proofread", minutes: 30, optional: false }] } as PlanRow["plan"];
    const later = item({ step: 2, title: "Proofread", starts_at: at("2026-11-25", "18:00").toISOString(), minutes: 30 });
    const items = [item({ step: 0, status: "done" }), item({ step: 1, title: "Draft", starts_at: at("2026-11-23", "19:00").toISOString() }), later];
    const out = planMaintenance({ now: at("2026-11-24", "08:00"), tz: TZ, blocks: DEFAULT_FREE_BLOCKS, plans: [plan], items });
    const placed = out.insert.map((i) => [i.step, i.starts_at] as const).sort((a, b) => a[1].localeCompare(b[1]));
    expect(placed.map((p) => p[0])).toEqual([1, 2]);
    expect(out.remove).toEqual([later.id]);
  });

  it("marks a task at risk when its steps no longer fit before the deadline", () => {
    const items = [item({ step: 0 })];
    const out = planMaintenance({ now: at("2026-11-24", "08:00"), tz: TZ, blocks: DEFAULT_FREE_BLOCKS, plans: [taskPlan(at("2026-11-24", "12:00"))], items });
    expect(out.update).toContainEqual({ id: "task-1", patch: { at_risk: true } });
  });

  it("marks a task done when every step is done or skipped", () => {
    const items = [item({ step: 0, status: "done" }), item({ step: 1, status: "skipped" })];
    const out = planMaintenance({ now: at("2026-11-24", "08:00"), tz: TZ, blocks: DEFAULT_FREE_BLOCKS, plans: [taskPlan(at("2026-11-27", "22:00"))], items });
    expect(out.update).toContainEqual({ id: "task-1", patch: { status: "done", at_risk: false } });
    expect(out.insert).toEqual([]);
  });

  it("adds nothing when run again on its own output", () => {
    const habit: PlanRow = {
      ...taskPlan(at("2026-11-27", "22:00")),
      id: "habit-1",
      kind: "habit",
      title: "Read",
      plan: {
        kind: "habit",
        title: "Read",
        levels: [
          { amount: 5, unit: "pages", label: "Read 5 pages" },
          { amount: 10, unit: "pages", label: "Read 10 pages" },
          { amount: 15, unit: "pages", label: "Read 15 pages" },
        ],
        minimum: "Read 1 page",
        window: { start: "06:00", end: "09:00" },
        trigger: "After breakfast",
        recovery: "Read one page tomorrow.",
        minutes: 15,
      },
    };
    const state = { now: at("2026-11-24", "08:00"), tz: TZ, blocks: DEFAULT_FREE_BLOCKS, plans: [taskPlan(at("2026-11-27", "22:00")), habit], items: [item({ step: 0 })] };
    const first = planMaintenance(state);
    expect(first.insert.length).toBeGreaterThan(0);
    const second = planMaintenance({ ...state, items: apply(state.items, first) });
    expect(second.insert).toEqual([]);
    expect(second.markMissed).toEqual([]);
  });

  it("folds a plan's reminders into the morning brief after 5 ignored in a row", () => {
    const ignored = Array.from({ length: 5 }, (_, i) =>
      item({
        step: 0,
        status: "missed",
        starts_at: at(`2026-11-1${i}`, "18:00").toISOString(),
        notified_at: at(`2026-11-1${i}`, "18:00").toISOString(),
      }),
    );
    const out = planMaintenance({ now: at("2026-11-24", "08:00"), tz: TZ, blocks: DEFAULT_FREE_BLOCKS, plans: [taskPlan(at("2026-11-27", "22:00"))], items: ignored });
    expect(out.update).toContainEqual({ id: "task-1", patch: { remind: false } });
  });
});
