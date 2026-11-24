import { describe, expect, it } from "vitest";
import { adaptTime, missedInARow, streak, weeklyLevel } from "./habits";

describe("weeklyLevel", () => {
  it("offers a level up after 6 or 7 of 7 days", () => {
    expect(weeklyLevel(1, 7, 3)).toEqual({ level: 1, offerUp: true, note: null });
    expect(weeklyLevel(1, 6, 3)).toEqual({ level: 1, offerUp: true, note: null });
  });

  it("doesn't offer a level up at the top level", () => {
    expect(weeklyLevel(3, 7, 3).offerUp).toBe(false);
  });

  it("stays at the same level after 4 or 5 days", () => {
    expect(weeklyLevel(2, 5, 3)).toEqual({ level: 2, offerUp: false, note: null });
    expect(weeklyLevel(2, 4, 3)).toEqual({ level: 2, offerUp: false, note: null });
  });

  it("moves down a level after 3 or fewer days, and says why", () => {
    expect(weeklyLevel(2, 3, 3)).toEqual({ level: 1, offerUp: false, note: "Moved down a level after 3 of 7 days. Easier to keep going." });
    expect(weeklyLevel(0, 1, 3).level).toBe(0);
  });
});

describe("streak", () => {
  it("counts done days back from today", () => {
    const days = [
      { date: "2026-11-24", status: "done" as const },
      { date: "2026-11-23", status: "done" as const },
      { date: "2026-11-22", status: "missed" as const },
    ];
    expect(streak(days, "2026-11-24")).toBe(2);
  });

  it("isn't broken by today still being planned or by a skipped rest day", () => {
    const days = [
      { date: "2026-11-24", status: "planned" as const },
      { date: "2026-11-23", status: "done" as const },
      { date: "2026-11-22", status: "skipped" as const },
      { date: "2026-11-21", status: "done" as const },
    ];
    expect(streak(days, "2026-11-24")).toBe(2);
  });
});

describe("missedInARow", () => {
  it("counts misses from the most recent backwards", () => {
    expect(missedInARow(["missed", "missed", "done", "missed"])).toBe(2);
    expect(missedInARow(["done", "missed"])).toBe(0);
  });
});

describe("adaptTime", () => {
  const window = { start: 6 * 60, end: 9 * 60 };
  const times = (n: number, minutes: number) => Array.from({ length: n }, () => minutes);

  it("keeps the current time until there are 14 check-ins", () => {
    expect(adaptTime(times(13, 7 * 60 + 40), window, 6 * 60)).toBe(6 * 60);
  });

  it("moves to the median check-in time, rounded to 5 minutes", () => {
    expect(adaptTime([...times(7, 7 * 60 + 41), ...times(7, 7 * 60 + 43)], window, 6 * 60)).toBe(7 * 60 + 40);
  });

  it("stays inside the habit's window", () => {
    expect(adaptTime(times(14, 11 * 60), window, 6 * 60)).toBe(9 * 60);
  });
});
