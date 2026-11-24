import { describe, expect, it } from "vitest";
import { progress, type ProgressItem } from "./progress";

const TZ = "Africa/Lagos";
const now = new Date("2026-11-24T10:00:00Z");
const it_ = (starts_at: string, status: ProgressItem["status"], step: number | null = null): ProgressItem => ({ plan_id: "p", starts_at, status, step });

describe("progress", () => {
  it("counts distinct finished task steps", () => {
    const plan = { kind: "task", level: 0, milestone: 0, plan: { kind: "task" as const, title: "Report", deadline: "2026-11-27T21:00:00Z", steps: [1, 2, 3].map((n) => ({ title: `S${n}`, minutes: 30, optional: false })) } };
    const items = [it_("2026-11-22T17:00:00Z", "done", 0), it_("2026-11-22T18:00:00Z", "missed", 1), it_("2026-11-23T17:00:00Z", "skipped", 1)];
    expect(progress(plan, items, TZ, now)).toBe("2 of 3 steps · due Fri 22:00");
  });

  it("shows a habit's streak, level and share done", () => {
    const level = { amount: 5, unit: "pages", label: "Read" };
    const plan = { kind: "habit", level: 1, milestone: 0, plan: { kind: "habit" as const, title: "Read", levels: [level, level, level], minimum: "1 page", window: { start: "06:00", end: "09:00" }, trigger: "t", recovery: "r", minutes: 15 } };
    const items = [it_("2026-11-24T05:00:00Z", "done"), it_("2026-11-23T05:00:00Z", "done"), it_("2026-11-22T05:00:00Z", "missed"), it_("2026-11-21T05:00:00Z", "done")];
    expect(progress(plan, items, TZ, now)).toBe("2-day streak · level 2 of 3 · 75% done in the last 30 days");
  });
});
