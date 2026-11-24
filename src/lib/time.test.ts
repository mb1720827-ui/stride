import { describe, expect, it } from "vitest";
import { addDays, formatLocal, localParts, toMinutes, zoned } from "./time";

describe("toMinutes", () => {
  it("turns HH:MM into minutes after midnight", () => {
    expect(toMinutes("18:30")).toBe(1110);
    expect(toMinutes("00:00")).toBe(0);
  });
});

describe("zoned", () => {
  it("turns Lagos wall time into the right UTC instant, even late at night", () => {
    expect(zoned("2026-11-24", 23 * 60 + 30, "Africa/Lagos").toISOString()).toBe("2026-11-24T22:30:00.000Z");
  });

  it("follows daylight saving changes", () => {
    expect(zoned("2026-03-08", 9 * 60, "America/New_York").toISOString()).toBe("2026-03-08T13:00:00.000Z");
    expect(zoned("2026-03-07", 9 * 60, "America/New_York").toISOString()).toBe("2026-03-07T14:00:00.000Z");
  });
});

describe("localParts", () => {
  it("puts an instant just after local midnight on the next local day", () => {
    expect(localParts(new Date("2026-11-24T23:30:00Z"), "Africa/Lagos")).toEqual({ date: "2026-11-25", minutes: 30, weekday: 3 });
  });

  it("round-trips with zoned", () => {
    const at = zoned("2026-07-01", 6 * 60 + 15, "America/New_York");
    expect(localParts(at, "America/New_York")).toEqual({ date: "2026-07-01", minutes: 375, weekday: 3 });
  });
});

describe("addDays", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("formatLocal", () => {
  it("shows the weekday and local time", () => {
    expect(formatLocal(new Date("2026-11-24T17:00:00Z"), "Africa/Lagos")).toBe("Tue 18:00");
  });
});
