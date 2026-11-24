"use client";

import { useActionState, useState } from "react";
import { quickAdd, type FormState } from "./actions";
import { input, secondaryButton } from "./ui";

/** Adds a task or a habit without the AI, so it works with the laptop off. */
export function QuickAdd() {
  const [state, action, pending] = useActionState<FormState, FormData>(quickAdd, {});
  const [kind, setKind] = useState<"task" | "habit">("task");
  return (
    <form action={action} className="flex flex-col gap-3">
      <fieldset className="flex gap-4 text-sm">
        <legend className="sr-only">Type</legend>
        {(["task", "habit"] as const).map((k) => (
          <label key={k} className="flex items-center gap-1.5">
            <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
            {k === "task" ? "Task with a deadline" : "Daily habit"}
          </label>
        ))}
      </fieldset>
      <label className="flex flex-col gap-1 text-sm font-medium">
        {kind === "task" ? "Task" : "Habit"}
        <input name="title" required maxLength={200} className={input} placeholder={kind === "task" ? "Submit CSC 401 assignment" : "Read 10 pages"} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        {kind === "task" ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Deadline
            <input name="deadline" type="datetime-local" required className={input} />
          </label>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Time
            <input name="time" type="time" required defaultValue="07:00" className={input} />
          </label>
        )}
        <label className="flex flex-col gap-1 text-sm font-medium">
          Minutes
          <input name="minutes" type="number" min={kind === "task" ? 5 : 2} max={600} required defaultValue={kind === "task" ? 60 : 15} className={input} />
        </label>
      </div>
      <button disabled={pending} className={`${secondaryButton} self-start`}>
        Add
      </button>
      {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
