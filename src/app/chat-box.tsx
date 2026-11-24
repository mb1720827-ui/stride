"use client";

import { useActionState } from "react";
import { sendRequest, type FormState } from "./actions";
import { input, primaryButton } from "./ui";

export function ChatBox({ initial }: { initial?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendRequest, {});
  return (
    <form action={action} className="flex flex-col gap-2">
      <label htmlFor="chat" className="font-semibold">
        What do you want to do?
      </label>
      <textarea
        id="chat"
        name="text"
        rows={2}
        required
        defaultValue={state.value ?? initial}
        placeholder="“Finish my project report by Friday”, “I want to read every day” or “I want to learn backend development”"
        className={`${input} resize-y`}
      />
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">Your laptop drafts a plan. Nothing is added until you accept it.</p>
        <button disabled={pending} className={primaryButton}>
          Plan it
        </button>
      </div>
      {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>}
    </form>
  );
}
