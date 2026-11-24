import Link from "next/link";
import type { ReactNode } from "react";
import { signOut } from "./actions";

export const card = "rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950";
export const input =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20 dark:border-zinc-700 dark:bg-zinc-900";
export const primaryButton = "rounded-lg bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60";
export const secondaryButton =
  "rounded-lg border border-zinc-300 px-3 py-1.5 font-medium hover:bg-zinc-100 disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-800";

export function Logo() {
  return (
    <Link href="/" className="text-xl font-bold tracking-tight">
      Str<span className="text-emerald-600 dark:text-emerald-400">ide</span>
    </Link>
  );
}

export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">{children}</main>;
}

const navLink = "rounded-lg px-3 py-1.5 font-medium hover:bg-zinc-100 dark:hover:bg-zinc-800";

export function Header() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3">
      <Logo />
      <nav className="flex items-center gap-1 text-sm">
        <Link href="/" className={navLink}>
          Today
        </Link>
        <Link href="/plans" className={navLink}>
          Plans
        </Link>
        <Link href="/review" className={navLink}>
          Review
        </Link>
        <Link href="/settings" className={navLink}>
          Settings
        </Link>
        <form action={signOut}>
          <button className="rounded-lg px-3 py-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">Sign out</button>
        </form>
      </nav>
    </header>
  );
}

const tones = {
  zinc: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
  emerald: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200",
};

export function Badge({ children, tone = "zinc" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}
