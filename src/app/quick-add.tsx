"use client";

import { useActionState, useState } from "react";
import { quickAdd, type FormState } from "./actions";
import { input, secondaryButton } from "./ui";

/** Adds a task or a habit without the AI, so it works with the laptop off. */
export function QuickAdd() {
  const [state, action, pending] = useActionState<FormState, FormData>(quickAdd, {});
  const [kind, setKind] = useState<"task" | "habit">("task");
  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset className="grid grid-cols-2 rounded-xl bg-ground p-1">
        <legend className="sr-only">Type</legend>
        {(["task", "habit"] as const).map((k) => (
          <label
            key={k}
            className={`press cursor-pointer rounded-lg py-2 text-center text-sm font-extrabold has-focus-visible:outline-3 has-focus-visible:outline-brand ${
              kind === k ? "bg-white text-ink" : "text-muted"
            }`}
          >
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
            {k === "task" ? "Task with a deadline" : "Daily habit"}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1.5 text-sm font-semibold">
        {kind === "task" ? "Task" : "Habit"}
        <input name="title" required maxLength={200} className={input} placeholder={kind === "task" ? "Submit CSC 401 assignment" : "Read 10 pages"} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {kind === "task" ? (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Deadline
            <input name="deadline" type="datetime-local" required className={input} />
          </label>
        ) : (
          <label className="flex flex-col gap-1.5 text-sm font-semibold">
            Time
            <input name="time" type="time" required defaultValue="07:00" className={input} />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-semibold">
          Minutes
          <input name="minutes" type="number" inputMode="numeric" min={kind === "task" ? 5 : 2} max={600} required defaultValue={kind === "task" ? 60 : 15} className={input} />
        </label>
      </div>
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-risk">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={`${secondaryButton} self-start`}>
        {pending ? "Adding…" : kind === "task" ? "Add task" : "Add habit"}
      </button>
    </form>
  );
}
