import { describe, expect, it } from "vitest";
import { deliver, isPushEndpoint, payloadFor, type DueRow } from "./push";

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
    const fcm = (id: string) => `https://fcm.googleapis.com/fcm/send/${id}`;
    const send = async (r: DueRow) => {
      if (r.endpoint === fcm("gone")) throw Object.assign(new Error("Gone"), { statusCode: 410 });
      if (r.endpoint === fcm("missing")) throw Object.assign(new Error("Not found"), { statusCode: 404 });
      if (r.endpoint === fcm("flaky")) throw Object.assign(new Error("Server error"), { statusCode: 500 });
    };
    const result = await deliver([row(fcm("ok")), row(fcm("gone")), row(fcm("missing")), row(fcm("flaky")), row(fcm("gone"), { kind: "brief" })], send);
    expect(result).toEqual({ sent: 1, gone: [fcm("gone"), fcm("missing")], failed: 1 });
  });

  it("never sends to a host that isn't a push service, and drops it", async () => {
    let calls = 0;
    const result = await deliver([row("https://169.254.169.254/latest/meta-data"), row("https://evil.example/fcm.googleapis.com")], async () => {
      calls++;
    });
    expect(calls).toBe(0);
    expect(result).toEqual({ sent: 0, gone: ["https://169.254.169.254/latest/meta-data", "https://evil.example/fcm.googleapis.com"], failed: 0 });
  });
});

describe("isPushEndpoint", () => {
  it("accepts the browsers' push services only, over https", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/abc")).toBe(true);
    expect(isPushEndpoint("https://wns2-par02p.notify.windows.com/w/?token=abc")).toBe(true);
    expect(isPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isPushEndpoint("https://fcm.googleapis.com.evil.example/x")).toBe(false);
    expect(isPushEndpoint("https://evilpush.apple.com.example/x")).toBe(false);
    expect(isPushEndpoint("not a url")).toBe(false);
  });
});

describe("payloadFor", () => {
  it("includes Done and Skip only for item reminders", () => {
    expect(JSON.parse(payloadFor(row("x")))).toMatchObject({ title: "Read 15 pages", item_id: row("x").item_id, actions: true });
    expect(JSON.parse(payloadFor(row("x", { kind: "brief", item_id: null })))).toMatchObject({ actions: false, tag: "brief" });
  });
});
