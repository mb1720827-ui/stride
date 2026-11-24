import { describe, expect, it } from "vitest";
import { DEFAULT_FREE_BLOCKS, freeSlots, placeDaily, placeSteps, placeWeekly, type FreeBlocks } from "./schedule";
import { localParts, zoned } from "./time";

const TZ = "Africa/Lagos";
const at = (date: string, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return zoned(date, h * 60 + m, TZ);
};
const local = (d: Date) => {
  const p = localParts(d, TZ);
  return `${p.date} ${String(Math.floor(p.minutes / 60)).padStart(2, "0")}:${String(p.minutes % 60).padStart(2, "0")}`;
};
const steps = [
  { title: "Outline", minutes: 60 },
  { title: "Draft", minutes: 60 },
  { title: "Polish", minutes: 60 },
];
// 2026-11-23 is a Monday.
const MON_NOON = at("2026-11-23", "12:00");
const FRI_22 = at("2026-11-27", "22:00");

describe("freeSlots", () => {
  it("lists each day's free blocks in order, clipped to the range", () => {
    const slots = freeSlots(DEFAULT_FREE_BLOCKS, TZ, MON_NOON, at("2026-11-24", "23:59"), []);
    expect(slots.map((s) => `${local(s.start)}-${local(s.end).slice(11)}`)).toEqual(["2026-11-23 18:00-22:00", "2026-11-24 18:00-22:00"]);
  });

  it("returns nothing when no free time is set", () => {
    const empty: FreeBlocks = { "0": [], "1": [], "2": [], "3": [], "4": [], "5": [], "6": [] };
    expect(freeSlots(empty, TZ, MON_NOON, FRI_22, [])).toEqual([]);
  });
});

describe("placeSteps", () => {
  it("places steps in order in the earliest free time", () => {
    const { placed, unplaced } = placeSteps(steps, freeSlots(DEFAULT_FREE_BLOCKS, TZ, MON_NOON, FRI_22, []), FRI_22, MON_NOON);
    expect(placed.map((p) => local(p.starts_at))).toEqual(["2026-11-23 18:00", "2026-11-23 19:00", "2026-11-23 20:00"]);
    expect(placed.map((p) => p.step)).toEqual([0, 1, 2]);
    expect(unplaced).toEqual([]);
  });

  it("works around something already scheduled", () => {
    const busy = [{ start: at("2026-11-23", "18:00"), end: at("2026-11-23", "19:00") }];
    const { placed } = placeSteps(steps, freeSlots(DEFAULT_FREE_BLOCKS, TZ, MON_NOON, FRI_22, busy), FRI_22, MON_NOON);
    expect(local(placed[0].starts_at)).toBe("2026-11-23 19:00");
  });

  it("returns every step as unplaced when the deadline leaves no free time", () => {
    const deadline = at("2026-11-23", "13:00");
    const result = placeSteps(steps, freeSlots(DEFAULT_FREE_BLOCKS, TZ, MON_NOON, deadline, []), deadline, MON_NOON);
    expect(result).toEqual({ placed: [], unplaced: [0, 1, 2] });
  });

  it("keeps the last 20% before the deadline free when there is room", () => {
    // Deadline Tuesday 22:00: 34 hours away, so the buffer starts around Tuesday 15:12 and Monday evening is used first.
    const deadline = at("2026-11-24", "22:00");
    const long = [{ title: "Big step", minutes: 240 }, { title: "Next", minutes: 60 }];
    const { placed, unplaced } = placeSteps(long, freeSlots(DEFAULT_FREE_BLOCKS, TZ, MON_NOON, deadline, []), deadline, MON_NOON);
    expect(local(placed[0].starts_at)).toBe("2026-11-23 18:00");
    // Monday evening is full, so "Next" falls back into the buffer on Tuesday rather than being dropped.
    expect(local(placed[1].starts_at)).toBe("2026-11-24 18:00");
    expect(unplaced).toEqual([]);
  });
});

describe("placeDaily", () => {
  it("uses the preferred time when it is free, even outside free blocks", () => {
    const starts = placeDaily(["2026-11-23", "2026-11-24"], 15, TZ, DEFAULT_FREE_BLOCKS, 6 * 60, []);
    expect(starts.map(local)).toEqual(["2026-11-23 06:00", "2026-11-24 06:00"]);
  });

  it("moves to the nearest free time when the preferred time is taken", () => {
    const busy = [{ start: at("2026-11-23", "18:00"), end: at("2026-11-23", "19:00") }];
    const [start] = placeDaily(["2026-11-23"], 30, TZ, DEFAULT_FREE_BLOCKS, 18 * 60, busy);
    expect(local(start)).toBe("2026-11-23 19:00");
  });
});

describe("placeWeekly", () => {
  it("spreads sessions over different days", () => {
    const starts = placeWeekly("2026-11-23", 3, 45, TZ, DEFAULT_FREE_BLOCKS, []);
    expect(new Set(starts.map((s) => localParts(s, TZ).date)).size).toBe(3);
    expect(starts.map(local)).toEqual(["2026-11-23 18:00", "2026-11-25 18:00", "2026-11-27 18:00"]);
  });

  it("skips days that have already passed", () => {
    const starts = placeWeekly("2026-11-23", 2, 45, TZ, DEFAULT_FREE_BLOCKS, [], at("2026-11-24", "12:00"));
    expect(starts.every((s) => s >= at("2026-11-24", "12:00"))).toBe(true);
    expect(starts).toHaveLength(2);
  });
});
