// Web Push delivery. deliver() and payloadFor() are pure; sendPush() uses the web-push library with this app's VAPID keys.
import webpush from "web-push";

/** One due notification for one device, as returned by stride_due_notifications(). */
export interface DueRow {
  kind: "brief" | "checkin" | "item" | "test";
  title: string;
  body: string;
  url: string;
  item_id: string | null;
  endpoint: string;
  p256dh: string;
  auth: string;
}

// Browsers' push services. Endpoints come from users, so anything else is refused: the server must never be made to
// send requests to arbitrary hosts (SSRF). The same rule is a CHECK constraint on stride_push_subscriptions.endpoint.
const PUSH_HOSTS = ["fcm.googleapis.com", "updates.push.services.mozilla.com"];
const PUSH_HOST_SUFFIXES = [".push.apple.com", ".notify.windows.com"];

export function isPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && url.port === "" && !url.username && (PUSH_HOSTS.includes(host) || PUSH_HOST_SUFFIXES.some((s) => host.endsWith(s)));
}

/** What the service worker (public/sw.js) receives. */
export function payloadFor(row: DueRow): string {
  return JSON.stringify({ title: row.title, body: row.body, url: row.url, item_id: row.item_id, tag: row.item_id ?? row.kind, actions: row.kind === "item" });
}

/** Sends every row. Devices the push service reports as gone (404/410) are returned so they can be removed. */
export async function deliver(rows: DueRow[], send: (row: DueRow) => Promise<unknown>): Promise<{ sent: number; gone: string[]; failed: number }> {
  let sent = 0;
  let failed = 0;
  const gone = new Set<string>();
  for (const row of rows) {
    if (gone.has(row.endpoint)) continue;
    if (!isPushEndpoint(row.endpoint)) {
      gone.add(row.endpoint);
      continue;
    }
    try {
      await send(row);
      sent++;
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      if (status === 404 || status === 410) gone.add(row.endpoint);
      else failed++;
    }
  }
  return { sent, gone: [...gone], failed };
}

let configured = false;
export function sendPush(row: DueRow) {
  if (!configured) {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    if (!publicKey || !privateKey) throw new Error("Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY.");
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "https://github.com/mb1720827-ui/stride", publicKey, privateKey);
    configured = true;
  }
  return webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payloadFor(row), { TTL: 3600, urgency: "normal" });
}
