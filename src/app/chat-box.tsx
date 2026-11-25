"use client";

import { useActionState, useState } from "react";
import { sendRequest, type FormState } from "./actions";
import { Icon } from "./icons";
import { input, primaryButton } from "./ui";

const EXAMPLES = ["Submit my assignment in 3 days", "I want to read every day", "I want to learn SQL for backend development"];

export function ChatBox({ initial }: { initial?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendRequest, {});
  const [text, setText] = useState(state.value ?? initial ?? "");
  return (
    <form action={action} className="flex flex-col gap-3">
      <label htmlFor="chat" className="text-lg font-extrabold">
        What do you want to do?
      </label>
      <textarea
        id="chat"
        name="text"
        rows={3}
        required
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="A task with a deadline, a habit, or a skill to learn"
        className={`${input} resize-none leading-relaxed`}
      />
      {!text && (
        <div className="flex flex-wrap gap-2" aria-label="Examples">
          {EXAMPLES.map((e) => (
            <button key={e} type="button" onClick={() => setText(e)} className="press rounded-full bg-track px-3 py-1.5 text-sm font-semibold hover:bg-track-hover">
              {e}
            </button>
          ))}
        </div>
      )}
      {state.error && (
        <p role="alert" className="text-sm font-semibold text-risk">
          {state.error}
        </p>
      )}
      <button disabled={pending} className={primaryButton}>
        {pending ? "Sending…" : "Plan it"}
        {!pending && <Icon name="send" className="size-5" />}
      </button>
      <p className="text-sm text-muted">Your laptop drafts it in about a minute. You&apos;ll see it on Today.</p>
    </form>
  );
}
