"use client";

import { useActionState, useRef, useState } from "react";
import { appendSpeech, tidyTranscript } from "@/lib/speech";
import { sendRequest, type FormState } from "./actions";
import { Icon } from "./icons";
import { input, primaryButton, quietButton } from "./ui";
import { VoiceButton } from "./voice-button";

const EXAMPLES = ["Submit my assignment in 3 days", "I want to read every day", "I want to learn SQL for backend development"];

export function ChatBox({ initial }: { initial?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendRequest, {});
  const [text, setText] = useState(state.value ?? initial ?? "");
  const [copied, setCopied] = useState(false);
  // What was in the box before the current voice note, so live words can be shown after it.
  const spokenBase = useRef("");

  async function copy() {
    await navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

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
        placeholder="Type it, or tap the microphone and say it"
        className={`${input} resize-none leading-relaxed`}
      />
      <div className="flex items-center justify-between gap-3">
        <VoiceButton
          onStart={() => {
            spokenBase.current = text;
          }}
          onInterim={(live) => setText(appendSpeech(spokenBase.current, live))}
          onFinal={(phrase) => {
            // A pause splits one sentence into several phrases; only a new sentence gets a capital.
            const before = spokenBase.current.trim();
            spokenBase.current = appendSpeech(spokenBase.current, tidyTranscript(phrase, !before || /[.!?]$/.test(before)));
            setText(spokenBase.current);
          }}
        />
        {text.trim() && (
          <button type="button" onClick={copy} className={`${quietButton} shrink-0`}>
            <Icon name={copied ? "check" : "copy"} className="size-4" />
            {copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>
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
