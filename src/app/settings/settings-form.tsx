"use client";

import { useActionState } from "react";
import { saveSettings, type FormState } from "../actions";
import { input, primaryButton } from "../ui";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <input name={name} type={type} required defaultValue={String(values[name])} min={type === "number" ? 2 : undefined} max={type === "number" ? 20 : undefined} className={input} />
    </label>
  );
  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Free time</legend>
        <p className="text-sm text-zinc-500">When tasks and study sessions can go. Write times like 18:00-22:00, separated by commas. Leave a day empty for none.</p>
        {DAYS.map((day, d) => (
          <label key={day} className="grid grid-cols-[6.5rem_1fr] items-center gap-2 text-sm">
            {day}
            <input name={`free_${d}`} defaultValue={(values.free_blocks[String(d)] ?? []).map((b) => `${b.start}-${b.end}`).join(", ")} className={input} />
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        {field("wake", "Wake up (morning brief)")}
        {field("sleep", "Bedtime")}
        {field("quiet_start", "Quiet hours start")}
        {field("quiet_end", "Quiet hours end")}
        {field("daily_cap", "Most notifications a day", "number")}
        {field("time_zone", "Time zone", "text")}
      </div>
      <button disabled={pending} className={`${primaryButton} self-start`}>
        Save
      </button>
      {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
