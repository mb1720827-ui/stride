"use client";

import { useState } from "react";
import { createCalendarToken } from "../actions";
import { secondaryButton } from "../ui";

/** Creates (or replaces) the private calendar link. It's shown once, because only a hash of it is stored. */
export function CalendarLink({ hasLink }: { hasLink: boolean }) {
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      {url ? (
        <>
          <p className="text-sm">Copy this link now. It won&apos;t be shown again.</p>
          <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="w-full rounded-lg border border-rule bg-ground px-3 py-2 font-mono text-xs" />
          <p className="text-sm text-muted">
            Google Calendar (on a computer): Other calendars › + › From URL. iPhone: Settings › Calendar › Accounts › Add Subscribed Calendar. Google can
            take a few hours to show changes; Stride itself is always up to date.
          </p>
        </>
      ) : (
        <button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const token = await createCalendarToken();
            setUrl(`${window.location.origin}/api/calendar/${token}.ics`);
            setBusy(false);
          }}
          className={`${secondaryButton} self-start`}
        >
          {hasLink ? "Make a new calendar link (the old one stops working)" : "Create a calendar link"}
        </button>
      )}
    </div>
  );
}
