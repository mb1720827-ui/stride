"use client";

import { useEffect, useState } from "react";
import { deletePushSubscription, savePushSubscription, sendTestPush, type FormState } from "../actions";
import { primaryButton, secondaryButton } from "../ui";

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

type Status = "checking" | "unsupported" | "off" | "on" | "blocked";

export function PushToggle({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [result, setResult] = useState<FormState>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !publicKey) return setStatus("unsupported");
      if (Notification.permission === "denied") return setStatus("blocked");
      const reg = await navigator.serviceWorker.register("/sw.js");
      setStatus((await reg.pushManager.getSubscription()) ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, [publicKey]);

  async function turnOn() {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return setStatus(permission === "denied" ? "blocked" : "off");
      const reg = await navigator.serviceWorker.register("/sw.js");
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) });
      const json = sub.toJSON();
      const saved = await savePushSubscription({ endpoint: sub.endpoint, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
      setResult(saved);
      if (!saved.error) setStatus("on");
    } catch {
      setResult({ error: "This browser couldn't turn on notifications." });
    } finally {
      setBusy(false);
    }
  }

  async function turnOff() {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      setResult(await deletePushSubscription(sub.endpoint));
      await sub.unsubscribe();
    }
    setStatus("off");
    setBusy(false);
  }

  return (
    <div className="flex flex-col gap-2">
      {status === "unsupported" && (
        <p className="text-sm text-muted">This browser can&apos;t receive notifications. On iPhone, first add Stride to your home screen (Share › Add to Home Screen).</p>
      )}
      {status === "blocked" && <p className="text-sm text-risk">Notifications are blocked for this site. Allow them in your browser&apos;s site settings.</p>}
      {status === "off" && (
        <button onClick={turnOn} disabled={busy} className={`${primaryButton} self-start`}>
          Turn on notifications on this device
        </button>
      )}
      {status === "on" && (
        <div className="flex flex-wrap gap-2">
          <button onClick={async () => setResult(await sendTestPush())} disabled={busy} className={secondaryButton}>
            Send a test
          </button>
          <button onClick={turnOff} disabled={busy} className={secondaryButton}>
            Turn off on this device
          </button>
        </div>
      )}
      {result.error && <p role="alert" className="text-sm text-risk font-semibold">{result.error}</p>}
      {result.message && <p role="status" className="text-sm text-brand font-semibold">{result.message}</p>}
    </div>
  );
}
