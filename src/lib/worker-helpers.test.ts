import { describe, expect, it } from "vitest";
import { checkLinks, reviewDue, takeawayItemId, weekStartOf } from "./worker-helpers";
import { zoned } from "./time";

const TZ = "Africa/Lagos";
const r = (url: string) => ({ stage: 0, title: url, url, type: "article" as const, free: true, reason: "Good intro" });

describe("checkLinks", () => {
  it("keeps only links that load, never non-web links", async () => {
    const fetcher = async (url: string) => {
      if (url.includes("down")) throw new Error("timeout");
      return { ok: !url.includes("missing") };
    };
    const kept = await checkLinks([r("https://ok.example/a"), r("https://missing.example/b"), r("https://down.example/c"), r("javascript:alert(1)"), r("https://ok.example/a")], fetcher);
    expect(kept.map((k) => k.url)).toEqual(["https://ok.example/a"]);
  });
});

describe("weekly review timing", () => {
  it("finds Monday of the current local week", () => {
    expect(weekStartOf(zoned("2026-11-29", 19 * 60, TZ), TZ)).toBe("2026-11-23");
    expect(weekStartOf(zoned("2026-11-23", 0, TZ), TZ)).toBe("2026-11-23");
  });

  it("is due on Sunday from 18:00 local time", () => {
    expect(reviewDue(zoned("2026-11-29", 18 * 60, TZ), TZ)).toBe(true);
    expect(reviewDue(zoned("2026-11-29", 17 * 60 + 59, TZ), TZ)).toBe(false);
    expect(reviewDue(zoned("2026-11-28", 20 * 60, TZ), TZ)).toBe(false);
  });
});

describe("takeawayItemId", () => {
  it("finds the save id in a link to a Takeaway note, and nothing else", () => {
    const id = "11111111-1111-4111-8111-111111111111";
    expect(takeawayItemId(`https://takeaway.example/i/${id}`, "https://takeaway.example")).toBe(id);
    expect(takeawayItemId(`https://takeaway.example/i/${id}`, "https://takeaway.example/")).toBe(id);
    expect(takeawayItemId(`https://other.example/i/${id}`, "https://takeaway.example")).toBeNull();
    expect(takeawayItemId(`https://takeaway.example/i/${id}`, undefined)).toBeNull();
  });
});
