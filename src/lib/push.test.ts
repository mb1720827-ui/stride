import { describe, expect, it } from "vitest";
import { deliver, payloadFor, type DueRow } from "./push";

const row = (endpoint: string, patch: Partial<DueRow> = {}): DueRow => ({
  kind: "item",
  title: "Read 15 pages",
  body: "15 min · now",
  url: "/",
  item_id: "11111111-1111-4111-8111-111111111111",
  endpoint,
  p256dh: "key",
  auth: "auth",
  ...patch,
});

describe("deliver", () => {
  it("counts sent notifications and collects devices the push service says are gone", async () => {
    const send = async (r: DueRow) => {
      if (r.endpoint === "gone") throw Object.assign(new Error("Gone"), { statusCode: 410 });
      if (r.endpoint === "missing") throw Object.assign(new Error("Not found"), { statusCode: 404 });
      if (r.endpoint === "flaky") throw Object.assign(new Error("Server error"), { statusCode: 500 });
    };
    const result = await deliver([row("ok"), row("gone"), row("missing"), row("flaky"), row("gone", { kind: "brief" })], send);
    expect(result).toEqual({ sent: 1, gone: ["gone", "missing"], failed: 1 });
  });
});

describe("payloadFor", () => {
  it("includes Done and Skip only for item reminders", () => {
    expect(JSON.parse(payloadFor(row("x")))).toMatchObject({ title: "Read 15 pages", item_id: row("x").item_id, actions: true });
    expect(JSON.parse(payloadFor(row("x", { kind: "brief", item_id: null })))).toMatchObject({ actions: false, tag: "brief" });
  });
});
