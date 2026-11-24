"use client";

import { useActionState } from "react";
import { authenticate, type FormState } from "./actions";
import { input } from "./ui";

export function AuthForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(authenticate, {});
  return (
    <form action={action} className="flex w-full flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Email
        <input name="email" type="email" autoComplete="email" required defaultValue={state.value} className={input} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Password
        <input name="password" type="password" autoComplete="current-password" minLength={8} required className={input} />
      </label>
      {state.error && <p role="alert" className="text-sm text-rose-600">{state.error}</p>}
      {state.message && <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">{state.message}</p>}
      <div className="flex gap-2">
        <button
          name="intent"
          value="signin"
          disabled={pending}
          className="flex-1 rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
        >
          Sign in
        </button>
        <button
          name="intent"
          value="signup"
          disabled={pending}
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-2 font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800"
        >
          Create account
        </button>
      </div>
      <p className="text-xs text-zinc-500">Already use Takeaway? Sign in with the same email and password.</p>
    </form>
  );
}
