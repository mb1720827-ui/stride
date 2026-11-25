import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { streak } from "@/lib/habits";
import { loadSettings } from "@/lib/maintain";
import { milestones, type SkillPlanT } from "@/lib/plans";
import { addDays, localParts, zoned } from "@/lib/time";
import { applySuggestion } from "../actions";
import { Marker, Page, panel, secondaryButton, SectionTitle, type StopState } from "../ui";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function ReviewPage() {
  return (
    <Suspense fallback={<Page title="This week">{null}</Page>}>
      <ReviewView />
    </Suspense>
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
    supabase.from("stride_items").select("plan_id, starts_at, status").gte("starts_at", new Date(now.getTime() - 60 * 86_400_000).toISOString()).lt("starts_at", zoned(addDays(monday, 7), 0, tz).toISOString()).order("starts_at"),
    supabase.from("stride_plans").select("id, kind, title, plan").eq("status", "active"),
    supabase.from("stride_quiz_attempts").select("plan_id, milestone, score").gte("created_at", from.toISOString()),
    supabase.from("stride_reviews").select("summary, suggestions").eq("week_start", monday).maybeSingle(),
  ]);
  const week = (items ?? []).filter((i) => new Date(i.starts_at) >= from);
  const count = (s: string) => week.filter((i) => i.status === s && new Date(i.starts_at) <= now).length;
  const habits = (plans ?? []).filter((p) => p.kind === "habit");
  const suggestions = (review?.suggestions ?? []) as { text: string; command?: unknown }[];

  return (
    <Page title="This week" guide={`${count("done")} done ∙ ${count("skipped")} skipped ∙ ${count("missed")} missed so far`}>
      {/* The week as seven short route lines, one per day. */}
      <section aria-label="Your week" className={`${panel} grid grid-cols-7 gap-1 px-2 pt-4 pb-3`}>
        {DAYS.map((d, k) => {
          const day = addDays(monday, k);
          const stops = week.filter((i) => localParts(new Date(i.starts_at), tz).date === day);
          const isToday = day === date;
          return (
            <div key={d} className="flex flex-col items-center gap-2">
              <span className={`text-xs font-extrabold ${isToday ? "rounded-md bg-here px-1.5 text-ink" : "text-muted"}`}>{d}</span>
              <div className="relative flex min-h-24 flex-col items-center gap-1.5 py-1">
                {stops.length > 0 && <span className="absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 bg-track" />}
                {stops.map((s, i) => (
                  <Marker key={i} state={(new Date(s.starts_at) > now && s.status === "planned" ? "planned" : s.status) as StopState} size="size-3.5" />
                ))}
              </div>
            </div>
          );
        })}
      </section>

      {habits.length > 0 && (
        <section>
          <SectionTitle>Streaks</SectionTitle>
          <ul className={`${panel} divide-y divide-rule overflow-hidden`}>
            {habits.map((h) => {
              const days = (items ?? []).filter((i) => i.plan_id === h.id).map((i) => ({ date: localParts(new Date(i.starts_at), tz).date, status: i.status }));
              const n = streak(days, date);
              return (
                <li key={h.id} className="flex items-baseline justify-between gap-3 px-4 py-3.5">
                  <span className="font-semibold">{h.title}</span>
                  <span className="tnum font-extrabold text-brand">
                    {n} {n === 1 ? "day" : "days"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {(attempts ?? []).length > 0 && (
        <section>
          <SectionTitle>Quizzes</SectionTitle>
          <ul className={`${panel} divide-y divide-rule overflow-hidden`}>
            {(attempts ?? []).map((a, i) => {
              const p = (plans ?? []).find((x) => x.id === a.plan_id);
              const m = p ? milestones(p.plan as SkillPlanT)[a.milestone] : undefined;
              return (
                <li key={i} className="flex items-baseline justify-between gap-3 px-4 py-3.5">
                  <span className="leading-snug font-semibold">{[p?.title, m?.title].filter(Boolean).join(", ") || "Quiz"}</span>
                  <span className={`tnum font-extrabold ${a.score >= 4 ? "text-brand" : "text-muted"}`}>{a.score} of 5</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section>
        <SectionTitle>Your coach</SectionTitle>
        <div className={`${panel} flex flex-col gap-4 p-4`}>
          {review?.summary ? (
            <>
              <p className="leading-relaxed whitespace-pre-line">{review.summary}</p>
              {suggestions.length > 0 && (
                <ul className="flex flex-col gap-2 border-t border-rule pt-4">
                  {suggestions.map((s, i) => (
                    <li key={i} className="flex items-center justify-between gap-3">
                      <span className="text-sm leading-snug">{s.text}</span>
                      {s.command ? (
                        <form action={applySuggestion}>
                          <input type="hidden" name="command" value={JSON.stringify(s.command)} />
                          <button className={`${secondaryButton} px-3 py-2 text-sm`}>Use this</button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <p className="text-muted">Your weekly summary and suggestions arrive on Sunday evening, while your laptop is on.</p>
          )}
        </div>
      </section>
    </Page>
  );
}
