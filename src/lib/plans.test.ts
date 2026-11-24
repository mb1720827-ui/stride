import { describe, expect, it } from "vitest";
import { Draft, HabitPlan, itemsFor, Quiz, TaskPlan, type SkillPlanT } from "./plans";
import { DEFAULT_FREE_BLOCKS } from "./schedule";
import { localParts, zoned } from "./time";

const TZ = "Africa/Lagos";
const ctx = (now: Date) => ({ now, tz: TZ, blocks: DEFAULT_FREE_BLOCKS, busy: [], days: 14 });

const habit = {
  kind: "habit" as const,
  title: "Read every day",
  levels: [
    { amount: 5, unit: "pages", label: "Read 5 pages" },
    { amount: 15, unit: "pages", label: "Read 15 pages" },
    { amount: 30, unit: "pages", label: "Read 30 pages" },
  ],
  minimum: "Read 1 page",
  window: { start: "06:00", end: "09:00" },
  trigger: "After morning prayers",
  recovery: "Never miss twice: read one page the next morning.",
  minutes: 20,
};
const task = {
  kind: "task" as const,
  title: "Project report",
  deadline: "2026-11-27T21:00:00.000Z",
  steps: [
    { title: "Outline", minutes: 60, optional: false },
    { title: "Draft", minutes: 60, optional: false },
  ],
};
const skill: SkillPlanT = {
  kind: "skill",
  title: "Backend development",
  stages: [
    { name: "Beginner", milestones: [{ title: "SQL basics", weeks: 2, topics: ["SELECT", "JOIN"] }] },
    { name: "Intermediate", milestones: [{ title: "REST APIs", weeks: 3, topics: ["HTTP", "routing"] }] },
  ],
  sessions_per_week: 3,
  minutes: 45,
  resource_queries: [{ stage: 0, query: "free SQL course for beginners" }],
};

describe("schemas", () => {
  it("accept valid plans through the Draft union", () => {
    expect(Draft.safeParse(habit).success).toBe(true);
    expect(Draft.safeParse(task).success).toBe(true);
    expect(Draft.safeParse(skill).success).toBe(true);
  });

  it("reject a habit with only two levels, a task with no steps and a quiz question with three options", () => {
    expect(HabitPlan.safeParse({ ...habit, levels: habit.levels.slice(0, 2) }).success).toBe(false);
    expect(TaskPlan.safeParse({ ...task, steps: [] }).success).toBe(false);
    const q = { q: "What does JOIN do?", options: ["a", "b", "c"], answer: 0, why: "Because." };
    expect(Quiz.safeParse({ questions: [q, q, q, q, q] }).success).toBe(false);
  });
});

describe("itemsFor", () => {
  it("gives a habit one item a day for 14 days, titled from the current level", () => {
    const { items } = itemsFor({ kind: "habit", title: habit.title, plan: habit, level: 1, milestone: 0 }, ctx(zoned("2026-11-23", 5 * 60, TZ)));
    expect(items).toHaveLength(14);
    expect(items.every((i) => i.title === "Read 15 pages" && i.minutes === 20)).toBe(true);
    expect(localParts(items[0].starts_at, TZ)).toMatchObject({ date: "2026-11-23", minutes: 6 * 60 });
  });

  it("starts a habit tomorrow when today's time has passed, and uses the minimum version after misses", () => {
    const { items } = itemsFor(
      { kind: "habit", title: habit.title, plan: habit, level: 1, milestone: 0 },
      { ...ctx(zoned("2026-11-23", 20 * 60, TZ)), useMinimum: true },
    );
    expect(localParts(items[0].starts_at, TZ).date).toBe("2026-11-24");
    expect(items[0].title).toBe("Read 1 page");
    expect(items[1].title).toBe("Read 15 pages");
  });

  it("gives a skill with 3 sessions a week 6 sessions over 14 days, named after the current milestone", () => {
    const { items } = itemsFor({ kind: "skill", title: skill.title, plan: skill, level: 0, milestone: 1 }, ctx(zoned("2026-11-23", 12 * 60, TZ)));
    expect(items).toHaveLength(6);
    expect(items[0].title).toBe("Backend development: REST APIs");
  });

  it("places only a task's remaining steps, keeping their step numbers, and reports what doesn't fit", () => {
    const { items, unplaced } = itemsFor(
      { kind: "task", title: task.title, plan: task, level: 0, milestone: 0 },
      { ...ctx(zoned("2026-11-23", 12 * 60, TZ)), doneSteps: [0] },
    );
    expect(items.map((i) => [i.step, i.title])).toEqual([[1, "Draft"]]);
    expect(unplaced).toEqual([]);
  });
});
