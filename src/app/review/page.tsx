import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { streak } from "@/lib/habits";
import { loadSettings } from "@/lib/maintain";
import { addDays, localParts, zoned } from "@/lib/time";
import { applySuggestion } from "../actions";
import { card, Header, Page, secondaryButton } from "../ui";

export default function ReviewPage() {
  return (
    <Page>
      <Header />
      <h1 className="text-2xl font-bold tracking-tight">This week</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <ReviewView />
      </Suspense>
    </Page>
  );
}

async function ReviewView() {
  const { supabase } = await requireUser();
  await connection();
  const now = new Date();
  const settings = await loadSettings(supabase);
  const tz = settings.time_zone;
  const { date, weekday } = localParts(now, tz);
  const monday = addDays(date, -((weekday + 6) % 7));
  const from = zoned(monday, 0, tz);

  const [{ data: items }, { data: plans }, { data: attempts }, { data: review }] = await Promise.all([
    supabase.from("stride_items").select("plan_id, starts_at, status").gte("starts_at", new Date(now.getTime() - 60 * 86_400_000).toISOString()).lte("starts_at", now.toISOString()),
    supabase.from("stride_plans").select("id, kind, title").eq("status", "active"),
    supabase.from("stride_quiz_attempts").select("plan_id, score").gte("created_at", from.toISOString()),
    supabase.from("stride_reviews").select("summary, suggestions").eq("week_start", monday).maybeSingle(),
  ]);
  const week = (items ?? []).filter((i) => new Date(i.starts_at) >= from);
  const count = (s: string) => week.filter((i) => i.status === s).length;
  const habits = (plans ?? []).filter((p) => p.kind === "habit");
  const suggestions = (review?.suggestions ?? []) as { text: string; command?: unknown }[];

  return (
    <>
      <section className={`${card} grid grid-cols-3 gap-3 text-center`}>
        {[
          ["Done", count("done")],
          ["Skipped", count("skipped")],
          ["Missed", count("missed")],
        ].map(([label, n]) => (
          <div key={label}>
            <p className="text-3xl font-bold">{n}</p>
            <p className="text-sm text-zinc-500">{label}</p>
          </div>
        ))}
      </section>

      {habits.length > 0 && (
        <section className={card}>
          <h2 className="mb-2 font-semibold">Streaks</h2>
          <ul className="flex flex-col gap-1">
            {habits.map((h) => {
              const days = (items ?? []).filter((i) => i.plan_id === h.id).map((i) => ({ date: localParts(new Date(i.starts_at), tz).date, status: i.status }));
              return (
                <li key={h.id} className="flex justify-between">
                  <span>{h.title}</span>
                  <span className="font-semibold">{streak(days, date)} days</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(attempts ?? []).length > 0 && (
        <section className={card}>
          <h2 className="mb-2 font-semibold">Quizzes</h2>
          <p>{(attempts ?? []).map((a) => `${a.score}/5`).join(", ")}</p>
        </section>
      )}

      <section className={`${card} flex flex-col gap-3`}>
        <h2 className="font-semibold">Your coach</h2>
        {review?.summary ? (
          <>
            <p className="leading-relaxed whitespace-pre-line">{review.summary}</p>
            {suggestions.map((s, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-xl bg-zinc-50 p-3 dark:bg-zinc-900">
                <span className="text-sm">{s.text}</span>
                {s.command ? (
                  <form action={applySuggestion}>
                    <input type="hidden" name="command" value={JSON.stringify(s.command)} />
                    <button className={secondaryButton}>Use this</button>
                  </form>
                ) : null}
              </div>
            ))}
          </>
        ) : (
          <p className="text-sm text-zinc-500">Your weekly summary and suggestions arrive on Sunday evening, while your laptop is on.</p>
        )}
      </section>
    </>
  );
}
