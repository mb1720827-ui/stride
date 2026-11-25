import { Suspense } from "react";
import { AuthForm } from "../auth-form";
import { Logo } from "../ui";

// A short route with three stops: what Stride does to your day, drawn rather than described.
const SAMPLE = [
  { time: "07:30", title: "Read 15 pages", done: true },
  { time: "18:00", title: "Project report: write the intro", done: false },
  { time: "19:15", title: "Backend: SQL joins", done: false },
];

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="on-brand bg-brand text-white">
        <div className="mx-auto max-w-xl px-5 pt-[max(env(safe-area-inset-top),24px)] pb-8">
          <Logo className="text-on-brand" />
          <h1 className="mt-6 text-[2.25rem] leading-[1.05] font-extrabold tracking-[-0.02em] text-balance">Type what you want. Stride plans your day around it.</h1>
          <ol aria-label="Example day" className="mt-7">
            {SAMPLE.map((s, i) => (
              <li key={s.time} className="grid grid-cols-[3rem_2rem_minmax(0,1fr)]">
                <span className="tnum pt-1 pr-1 text-right text-sm font-extrabold text-on-brand">{s.time}</span>
                <span className="flex flex-col items-center">
                  <span className={`h-1 w-1 ${i === 1 ? "bg-white" : ""}`} />
                  <span className={`size-4 shrink-0 rounded-full border-4 border-white ${s.done ? "bg-white" : i === 1 ? "bg-here" : "bg-brand"}`} />
                  <span className={`w-1 flex-1 ${i === SAMPLE.length - 1 ? "" : i === 0 ? "bg-white" : "bg-[repeating-linear-gradient(to_bottom,white_0_6px,transparent_6px_11px)]"}`} />
                </span>
                <span className="pt-0.5 pb-4 pl-1 text-[15px] font-semibold">{s.title}</span>
              </li>
            ))}
          </ol>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-5 px-5 py-8">
        <Suspense fallback={null}>
          <ConfirmError searchParams={searchParams} />
        </Suspense>
        <AuthForm />
      </main>
    </div>
  );
}

async function ConfirmError({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "confirm") return null;
  return (
    <p role="alert" className="font-semibold text-risk">
      That confirmation link didn&apos;t work. It may have expired, so try signing up again.
    </p>
  );
}
