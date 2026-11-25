import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import type { PlanDraft } from "@/lib/plans";
import { progress, routeStops, type ProgressItem } from "@/lib/progress";
import { streak } from "@/lib/habits";
import { addDays, formatLocal, localParts } from "@/lib/time";
import { extendDeadline, requestQuiz, setPlanStatus, setRemind } from "../../actions";
import { Icon } from "../../icons";
import { Resources } from "../../resources";
import { RouteList } from "../../route-list";
import { HabitLoop, Page, panel, primaryButton, quietButton, secondaryButton, SectionTitle } from "../../ui";

const KIND = { task: "Task", habit: "Habit", skill: "Skill" } as const;
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];

export default function PlanPage({ params, searchParams }: PageProps<"/plans/[id]">) {
  return (
    <Suspense fallback={<Page title="Plan" back={{ href: "/plans", label: "Plans" }}>{null}</Page>}>
      <PlanView params={params} searchParams={searchParams} />
    </Suspense>
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
  const upcoming = all.filter((i) => i.status === "planned" && new Date(i.starts_at) > now).slice(0, 6);
  const takeawayUrl = process.env.TAKEAWAY_URL?.replace(/\/+$/, "");
  const { data: saves } =
    takeawayUrl && plan.kind === "skill"
      ? await supabase.from("takeaway_items").select("id, title").eq("skill_id", plan.id).order("created_at", { ascending: false }).limit(20)
      : { data: [] };
  const stops = routeStops({ plan: p, milestone: plan.milestone }, all, tz, now);
  const today = localParts(now, tz).date;
  const lastWeek = Array.from({ length: 7 }, (_, k) => addDays(today, k - 6));
  const habitStreak = streak(all.map((i) => ({ date: localParts(new Date(i.starts_at), tz).date, status: i.status })), today);

  return (
    <Page
      title={plan.title}
      back={{ href: "/plans", label: "Plans" }}
      guide={
        <>
          {KIND[plan.kind as keyof typeof KIND]}
          {plan.status !== "active" && ` ∙ ${plan.status}`} ∙ {progress({ ...plan, plan: p }, past30, tz, now)}
        </>
      }
    >
      {typeof quiz === "string" && (
        <p role="status" className={`${panel} p-4 font-semibold`}>
          You got {quiz} of 5. {Number(quiz) >= 4 ? "Milestone passed, on to the next one." : "Not yet: a review session is set for tomorrow, then try again."}
        </p>
      )}

      {plan.at_risk && p.kind === "task" && (
        <section className="rounded-2xl bg-risk-soft p-4">
          <p className="font-extrabold text-risk">The remaining steps don&apos;t fit before the deadline.</p>
          <p className="mt-1 text-sm">Give it more time, add free time in Settings, or skip a step from Today.</p>
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

      <section className={`${panel} p-4 pt-5`}>
        {p.kind === "task" && (
          <RouteList
            label="Steps"
            stops={[
              ...p.steps.map((s, i) => {
                const latest = all.filter((x) => x.step === i).at(-1);
                return {
                  key: String(i),
                  label: i + 1,
                  title: s.title,
                  sub: latest?.status === "planned" ? `${formatLocal(new Date(latest.starts_at), tz)} ∙ ${s.minutes} min` : `${s.minutes} min`,
                  minutes: s.minutes,
                  state: stops[i],
                };
              }),
              { key: "due", label: "Due", title: formatLocal(new Date(p.deadline), tz), terminus: true },
            ]}
          />
        )}

        {p.kind === "habit" && (
          <>
            <SectionTitle>Last 7 days</SectionTitle>
            <div className="mb-4">
              <HabitLoop stops={stops} days={lastWeek.map((d) => WEEKDAY[new Date(`${d}T12:00:00Z`).getUTCDay()])} streak={habitStreak} />
            </div>
            <RouteList
              label="Levels"
              stops={p.levels.map((l, i) => ({
                key: String(i),
                label: `L${i + 1}`,
                title: l.label,
                sub: i === plan.level ? "You're here" : undefined,
                state: i < plan.level ? "done" : "planned",
              }))}
            />
            <dl className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 border-t border-rule px-1 pt-4 text-sm">
              <dt className="font-semibold text-muted">When</dt>
              <dd>
                {p.window.start}–{p.window.end}, {p.minutes} min
              </dd>
              <dt className="font-semibold text-muted">Trigger</dt>
              <dd>{p.trigger}</dd>
              <dt className="font-semibold text-muted">Bad day</dt>
              <dd>{p.minimum}</dd>
              <dt className="font-semibold text-muted">If you miss</dt>
              <dd>{p.recovery}</dd>
              {plan.level_note && (
                <>
                  <dt className="font-semibold text-muted">Last week</dt>
                  <dd>{plan.level_note}</dd>
                </>
              )}
            </dl>
          </>
        )}

        {p.kind === "skill" && (
          <>
            <RouteList
              label="Roadmap"
              stops={(() => {
                let n = -1;
                return p.stages.flatMap((stage, si) => [
                  { key: `s${si}`, title: stage.name, heading: true },
                  ...stage.milestones.map((m, mi) => {
                    n++;
                    return {
                      key: `m${si}-${mi}`,
                      label: `${m.weeks}w`,
                      title: m.title,
                      sub: n === plan.milestone ? `You're here ∙ ${m.topics.join(" ∙ ")}` : m.topics.join(" ∙ "),
                      state: n < plan.milestone ? ("done" as const) : ("planned" as const),
                    };
                  }),
                ]);
              })()}
            />
            {plan.status === "active" && (
              <form action={requestQuiz} className="mt-1 border-t border-rule pt-4">
                <input type="hidden" name="id" value={plan.id} />
                <button className={`${primaryButton} w-full`}>Take the milestone quiz</button>
                {(attempts ?? []).length > 0 && (
                  <p className="tnum mt-2 text-center text-sm text-muted">Recent scores: {(attempts ?? []).map((a) => `${a.score}/5`).join(", ")}</p>
                )}
              </form>
            )}
          </>
        )}
      </section>

      {p.kind === "skill" && ((resources ?? []).length > 0 || (saves ?? []).length > 0) && (
        <section>
          <SectionTitle>Resources</SectionTitle>
          <div className={`${panel} p-4`}>
            {(resources ?? []).length > 0 && <Resources resources={resources ?? []} stages={p.stages.map((s) => s.name)} />}
            {(saves ?? []).length > 0 && (
              <div className={(resources ?? []).length ? "mt-4 border-t border-rule pt-4" : ""}>
                <h3 className="mb-1 px-1 font-extrabold">From your Takeaway saves</h3>
                <ul className="divide-y divide-rule">
                  {(saves ?? []).map((s) => (
                    <li key={s.id}>
                      <a href={`${takeawayUrl}/i/${s.id}`} className="press flex items-center gap-3 rounded-lg px-1 py-3 font-semibold hover:bg-ground">
                        <span className="min-w-0 flex-1">{s.title ?? "A save"}</span>
                        <Icon name="external" className="size-4 text-muted" />
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionTitle>Coming up</SectionTitle>
          <ul className={`${panel} divide-y divide-rule overflow-hidden`}>
            {upcoming.map((i) => (
              <li key={i.id} className="flex items-baseline gap-3 px-4 py-3">
                <span className="tnum w-[4.75rem] shrink-0 text-sm font-extrabold">{formatLocal(new Date(i.starts_at), tz)}</span>
                <span className="min-w-0 flex-1 leading-snug">{i.title.startsWith(`${plan.title}: `) ? i.title.slice(plan.title.length + 2) : i.title}</span>
                <span className="tnum text-[13px] text-muted">{i.minutes} min</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className={`${panel} flex flex-col gap-4 p-4`}>
        <form action={setRemind} className="flex items-center justify-between gap-3">
          <input type="hidden" name="id" value={plan.id} />
          <label className="flex items-start gap-3 text-sm">
            <input type="checkbox" name="remind" defaultChecked={plan.remind} className="mt-0.5 size-5 accent-brand" />
            <span>
              <span className="block font-semibold">A reminder for each session</span>
              <span className="text-muted">Off means it only shows in the morning brief.</span>
            </span>
          </label>
          <button className={secondaryButton}>Save</button>
        </form>
        <form action={setPlanStatus} className="flex flex-wrap items-center gap-2 border-t border-rule pt-4">
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
          {/* Archiving stands apart from the everyday actions. */}
          {plan.status !== "archived" && (
            <button name="status" value="archived" className={`${quietButton} ml-auto`}>
              Archive
            </button>
          )}
        </form>
      </section>
    </Page>
  );
}
