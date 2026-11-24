import { describe, expect, it } from "vitest";
import { toIcs } from "./ics";

const now = new Date("2026-11-24T12:00:00Z");
const item = (patch: Partial<Parameters<typeof toIcs>[0][number]> = {}) => ({
  id: "11111111-1111-4111-8111-111111111111",
  title: "Read 15 pages",
  starts_at: "2026-11-24T17:00:00Z",
  minutes: 60,
  status: "planned",
  ...patch,
});
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("toIcs", () => {
  it("writes a calendar with UTC start and end times and CRLF line endings", () => {
    const ics = toIcs([item()], now);
    expect(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("\r\nUID:11111111-1111-4111-8111-111111111111@stride\r\n");
    expect(ics).toContain("\r\nDTSTART:20261124T170000Z\r\n");
    expect(ics).toContain("\r\nDTEND:20261124T180000Z\r\n");
    expect(ics).toContain("\r\nDTSTAMP:20261124T120000Z\r\n");
    expect(ics.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("escapes commas, semicolons, backslashes and new lines in titles", () => {
    expect(unfold(toIcs([item({ title: "Read, write; think\\now\nlater" })], now))).toContain("SUMMARY:Read\\, write\\; think\\\\now\\nlater\r\n");
  });

  it("marks done items and folds long lines at 75 bytes", () => {
    const title = "Backend development: ".repeat(10) + "é";
    const ics = toIcs([item({ title, status: "done" })], now);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
    expect(unfold(ics)).toContain(`SUMMARY:✓ ${title}\r\n`);
  });
});
