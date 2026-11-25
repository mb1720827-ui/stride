"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "../actions";
import { input, panel, primaryButton, SectionTitle } from "../ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// Monday first, as a week reads.
const ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface SettingsValues {
  time_zone: string;
  wake: string;
  sleep: string;
  quiet_start: string;
  quiet_end: string;
  daily_cap: number;
  free_blocks: Record<string, { start: string; end: string }[]>;
}

export function SettingsForm({ values }: { values: SettingsValues }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveSettings, {});
  const field = (name: keyof SettingsValues, label: string, type = "time") => (
    <label className="flex flex-col gap-1.5 text-sm font-semibold">
      {label}
      <input
        name={name}
        type={type}
        required
        defaultValue={String(values[name])}
        min={type === "number" ? 2 : undefined}
        max={type === "number" ? 20 : undefined}
        inputMode={type === "number" ? "numeric" : undefined}
        className={input}
      />
    </label>
  );
  return (
    <form action={action} className="flex flex-col gap-6">
      <section>
        <SectionTitle>Free time</SectionTitle>
        <div className={`${panel} flex flex-col gap-3 p-4`}>
          <p className="text-sm text-muted">When tasks and study sessions can go. Write times like 18:00-22:00, separated by commas. Leave a day empty for none.</p>
          {ORDER.map((d) => (
            <label key={d} className="grid grid-cols-1 gap-1.5 text-sm font-semibold sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-2">
              {DAYS[d]}
              <input name={`free_${d}`} defaultValue={(values.free_blocks[String(d)] ?? []).map((b) => `${b.start}-${b.end}`).join(", ")} className={`${input} tnum py-2.5`} />
            </label>
          ))}
        </div>
      </section>
      <section>
        <SectionTitle>Your day</SectionTitle>
        <div className={`${panel} grid grid-cols-2 gap-3 p-4`}>
          {field("wake", "Wake up (morning brief)")}
          {field("sleep", "Bedtime")}
          {field("quiet_start", "Quiet hours from")}
          {field("quiet_end", "Quiet hours until")}
          {field("daily_cap", "Most notifications a day", "number")}
          <div className="col-span-2">{field("time_zone", "Time zone", "text")}</div>
        </div>
      </section>
      <div className="flex flex-col gap-2">
        <button disabled={pending} className={primaryButton}>
          {pending ? "Saving…" : "Save changes"}
        </button>
        {state.error && (
          <p role="alert" className="text-sm font-semibold text-risk">
            {state.error}
          </p>
        )}
        {state.message && (
          <p role="status" className="text-sm font-semibold text-brand">
            {state.message}
          </p>
        )}
      </div>
    </form>
  );
}
