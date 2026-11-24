import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import { milestones, type PlanDraft } from "@/lib/plans";
import { progress, type ProgressItem } from "@/lib/progress";
import { formatLocal } from "@/lib/time";
import { extendDeadline, requestQuiz, setPlanStatus, setRemind } from "../../actions";
import { Resources } from "../../resources";
import { Badge, card, Header, Page, primaryButton, secondaryButton } from "../../ui";

export default function PlanPage({ params, searchParams }: PageProps<"/plans/[id]">) {
  return (
    <Page>
      <Header />
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <PlanView params={params} searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function PlanView({ params, searchParams }: Pick<PageProps<"/plans/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { quiz } = await searchParams;
  const { supabase } = await requireUser();
  await connection();
  const now = new Date();
  const [settings, { data: plan }, { data: items }, { data: resources }, { data: attempts }] = await Promise.all([
    loadSettings(supabase),
    supabase.from("stride_plans").select("id, kind, title, status, plan, level, milestone, at_risk, remind, level_note").eq("id", id).maybeSingle(),
    supabase.from("stride_items").select("id, plan_id, title, starts_at, minutes, status, step").eq("plan_id", id).order("starts_at"),
    supabase.from("stride_resources").select("stage, title, url, type, free, reason").eq("plan_id", id).order("stage"),
    supabase.from("stride_quiz_attempts").select("milestone, score, created_at").eq("plan_id", id).order("created_at", { ascending: false }).limit(5),
  ]);
  if (!plan) notFound();
  const tz = settings.time_zone;
  const p = plan.plan as PlanDraft;
  const all = (items ?? []) as (ProgressItem & { id: string; title: string; minutes: number })[];
  const past30 = all.filter((i) => new Date(i.starts_at) <= now && now.getTime() - new Date(i.starts_at).getTime() <= 30 * 86_400_000);
  const upcoming = all.filter((i) => i.status === "planned" && new Date(i.starts_at) > now).slice(0, 7);

  return (
    <>
      <div className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <Badge tone={plan.kind === "task" ? "sky" : plan.kind === "habit" ? "emerald" : "amber"}>{plan.kind}</Badge>
          {plan.status !== "active" && <Badge>{plan.status}</Badge>}
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{plan.title}</h1>
        <p className="text-zinc-600 dark:text-zinc-400">{progress(plan, past30, tz, now)}</p>
      </div>

      {typeof quiz === "string" && (
        <p role="status" className={`rounded-xl p-4 ${Number(quiz) >= 4 ? "bg-emerald-50 dark:bg-emerald-950" : "bg-amber-50 dark:bg-amber-950"}`}>
          You got {quiz} of 5.{" "}
          {Number(quiz) >= 4 ? "Milestone passed: on to the next one." : "Not yet. A review session is planned for tomorrow, then try again."}
        </p>
      )}

      {plan.at_risk && p.kind === "task" && (
        <section className="rounded-2xl border border-rose-300 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-950">
          <p className="font-semibold">The remaining steps don&apos;t fit before the deadline.</p>
          <p className="mt-1 text-sm">Extend the deadline, add free time in Settings, or skip optional steps from Today.</p>
          <form action={extendDeadline} className="mt-3 flex gap-2">
            <input type="hidden" name="id" value={plan.id} />
            <button name="days" value="1" className={secondaryButton}>
              +1 day
            </button>
            <button name="days" value="3" className={secondaryButton}>
              +3 days
            </button>
          </form>
        </section>
      )}

      <section className={`${card} flex flex-col gap-3`}>
        {p.kind === "task" && (
          <ol className="flex list-decimal flex-col gap-1.5 pl-5">
            {p.steps.map((s, i) => {
              const latest = all.filter((x) => x.step === i).at(-1);
              return (
                <li key={i}>
                  {s.title} <span className="text-sm text-zinc-500">· {s.minutes} min</span>{" "}
                  {latest && (
                    <span className="text-sm text-zinc-500">
                      · {latest.status === "planned" ? formatLocal(new Date(latest.starts_at), tz) : latest.status}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        )}

        {p.kind === "habit" && (
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-zinc-500">Levels</dt>
            <dd>
              <ol className="list-decimal pl-5">
                {p.levels.map((l, i) => (
                  <li key={i} className={i === plan.level ? "font-semibold" : ""}>
                    {l.label}
                    {i === plan.level && " ← now"}
                  </li>
                ))}
              </ol>
            </dd>
            <dt className="text-zinc-500">When</dt>
            <dd>
              Between {p.window.start} and {p.window.end}, {p.minutes} min
            </dd>
            <dt className="text-zinc-500">Trigger</dt>
            <dd>{p.trigger}</dd>
            <dt className="text-zinc-500">Bad day</dt>
            <dd>{p.minimum}</dd>
            <dt className="text-zinc-500">If you miss</dt>
            <dd>{p.recovery}</dd>
            {plan.level_note && (
              <>
                <dt className="text-zinc-500">Last week</dt>
                <dd>{plan.level_note}</dd>
              </>
            )}
          </dl>
        )}

        {p.kind === "skill" && (
          <>
            <ol className="flex flex-col gap-1.5">
              {milestones(p).map((m, i) => (
                <li key={i} className={`text-sm ${i === plan.milestone ? "font-semibold" : i < plan.milestone ? "text-zinc-400 line-through" : ""}`}>
                  <span className="text-zinc-500">{m.stageName} · </span>
                  {m.title} <span className="font-normal text-zinc-500">· {m.topics.join(", ")}</span>
                </li>
              ))}
            </ol>
            {plan.status === "active" && (
              <form action={requestQuiz}>
                <input type="hidden" name="id" value={plan.id} />
                <button className={primaryButton}>Take the milestone quiz</button>
              </form>
            )}
            {(attempts ?? []).length > 0 && (
              <p className="text-sm text-zinc-500">
                Recent quizzes: {(attempts ?? []).map((a) => `${a.score}/5`).join(", ")}
              </p>
            )}
            {(resources ?? []).length > 0 && <Resources resources={resources ?? []} />}
          </>
        )}
      </section>

      {upcoming.length > 0 && (
        <section className={card}>
          <h2 className="mb-2 font-semibold">Coming up</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {upcoming.map((i) => (
              <li key={i.id}>
                <span className="font-mono text-zinc-500">{formatLocal(new Date(i.starts_at), tz)}</span> {i.title}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${card} flex flex-col gap-3`}>
        <form action={setRemind} className="flex items-center gap-2 text-sm">
          <input type="hidden" name="id" value={plan.id} />
          <label className="flex items-center gap-2">
            <input type="checkbox" name="remind" defaultChecked={plan.remind} />
            Send a reminder for each session (otherwise it&apos;s only in the morning brief)
          </label>
          <button className={secondaryButton}>Save</button>
        </form>
        <form action={setPlanStatus} className="flex flex-wrap gap-2">
          <input type="hidden" name="id" value={plan.id} />
          {plan.status === "active" ? (
            <button name="status" value="paused" className={secondaryButton}>
              Pause
            </button>
          ) : (
            <button name="status" value="active" className={secondaryButton}>
              Make active
            </button>
          )}
          {plan.status !== "done" && (
            <button name="status" value="done" className={secondaryButton}>
              Mark done
            </button>
          )}
          {plan.status !== "archived" && (
            <button name="status" value="archived" className={secondaryButton}>
              Archive
            </button>
          )}
        </form>
        <Link href="/plans" className="text-sm text-zinc-500 underline">
          All plans
        </Link>
      </section>
    </>
  );
}
