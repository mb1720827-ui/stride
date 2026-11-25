import Link from "next/link";
import { redirect } from "next/navigation";
import { Fragment, Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings, maintain } from "@/lib/maintain";
import { streak } from "@/lib/habits";
import { milestones, type PlanDraft } from "@/lib/plans";
import { addDays, localParts, timeLocal, zoned } from "@/lib/time";
import { answerLevelOffer } from "./actions";
import { AutoRefresh } from "./auto-refresh";
import { Icon } from "./icons";
import { NowStop, Stop, type StopItem } from "./stop";
import { NowChip, Page, panel, primaryButton, quietButton, Row, SectionTitle } from "./ui";

const DAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const KIND = { task: "Task", habit: "Habit", skill: "Skill" } as const;

export default function Today({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<TodayShell />}>
      <TodayView searchParams={searchParams} />
    </Suspense>
  );
}

function TodayShell() {
  return (
    <Page title="Today">
      <p className="px-1 text-muted">Loading your route…</p>
    </Page>
  );
}

async function TodayView({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { q } = await searchParams;
  // Links from Takeaway ("Plan it in Stride") arrive here with the idea filled in.
  if (typeof q === "string" && q.trim()) redirect(`/new?q=${encodeURIComponent(q.slice(0, 1000))}`);

  const { supabase } = await requireUser();
  const now = new Date();
  const settings = await loadSettings(supabase);
  if (!settings.maintained_at || now.getTime() - new Date(settings.maintained_at).getTime() > 10 * 60_000) await maintain(supabase, now);

  const tz = settings.time_zone;
  const { date: today, weekday } = localParts(now, tz);
  const takeawayUrl = process.env.TAKEAWAY_URL?.replace(/\/+$/, "");
  const [{ data: itemData }, { data: requests }, { data: plans }, { count: recall }] = await Promise.all([
    supabase
      .from("stride_items")
      .select("id, title, starts_at, minutes, status, step, plan:stride_plans(id, kind)")
      .gte("starts_at", zoned(today, 0, tz).toISOString())
      .lt("starts_at", zoned(addDays(today, 1), 0, tz).toISOString())
      .order("starts_at"),
    supabase
      .from("stride_requests")
      .select("id, text, status, error, created_at")
      .in("status", ["queued", "processing", "ready", "failed"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("stride_plans").select("id, kind, title, at_risk, level_offer, level_note, level, milestone, plan").eq("status", "active"),
    takeawayUrl
      ? supabase.from("takeaway_cards").select("id", { count: "exact", head: true }).lte("due_at", now.toISOString())
      : Promise.resolve({ count: 0 }),
  ]);

  // Progress on each stop's meta line: habit streaks, skill milestones, task steps.
  const habitIds = (plans ?? []).filter((p) => p.kind === "habit").map((p) => p.id);
  const { data: history } = habitIds.length
    ? await supabase.from("stride_items").select("plan_id, starts_at, status").in("plan_id", habitIds).gte("starts_at", new Date(now.getTime() - 30 * 86_400_000).toISOString()).lte("starts_at", now.toISOString())
    : { data: [] };
  const streaks = new Map(habitIds.map((id) => [id, streak((history ?? []).filter((h) => h.plan_id === id).map((h) => ({ date: localParts(new Date(h.starts_at), tz).date, status: h.status })), today)]));
  const planById = new Map((plans ?? []).map((p) => [p.id, p]));
  const progressFor = (kind: string, planId: string | undefined, step: number | null) => {
    const p = planId ? planById.get(planId) : undefined;
    if (!p) return null;
    const draft = p.plan as PlanDraft;
    if (kind === "habit") {
      const n = streaks.get(p.id) ?? 0;
      return n > 0 ? `${n}-day streak` : null;
    }
    if (draft.kind === "skill") {
      const all = milestones(draft);
      return `milestone ${Math.min(p.milestone, all.length - 1) + 1} of ${all.length}`;
    }
    if (draft.kind === "task" && step !== null) return `step ${step + 1} of ${draft.steps.length}`;
    return null;
  };

  const items: StopItem[] = (itemData ?? []).map((i) => {
    const plan = Array.isArray(i.plan) ? i.plan[0] : i.plan;
    const kind = KIND[plan?.kind as keyof typeof KIND] ?? "Plan";
    const extra = progressFor(plan?.kind, plan?.id, i.step);
    return {
      id: i.id,
      title: i.title,
      time: timeLocal(new Date(i.starts_at), tz),
      minutes: i.minutes,
      status: i.status,
      meta: [kind, `${i.minutes} min`, extra].filter(Boolean).join(" ∙ "),
      href: plan ? `/plans/${plan.id}` : "/plans",
      startsAt: i.starts_at,
    } as StopItem & { startsAt: string };
  });
  const startsAt = (i: StopItem) => new Date((i as StopItem & { startsAt: string }).startsAt);
  const done = items.filter((i) => i.status === "done").length;
  const nowIndex = items.filter((i) => startsAt(i) <= now).length;
  const next = items.find((i) => i.status === "planned");
  const upcoming = items.find((i) => i.status === "planned" && startsAt(i) > now);
  const drafting = (requests ?? []).some((r) => r.status === "queued" || r.status === "processing");
  const noFreeTime = Object.values(settings.free_blocks).every((b) => b.length === 0);
  const atRisk = (plans ?? []).filter((p) => p.at_risk);
  const offers = (plans ?? []).filter((p) => p.level_offer);
  const notes = (plans ?? []).filter((p) => p.level_note && !p.level_offer);
  const hasUpdates = (requests ?? []).length + atRisk.length + offers.length + notes.length + (recall ? 1 : 0) + (noFreeTime ? 1 : 0) > 0;

  return (
    <Page
      title={DAY[weekday]}
      guide={
        <>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              Now <NowChip>{timeLocal(now, tz)}</NowChip>
            </span>
            <span className="tnum">{upcoming ? `Next ${upcoming.time}` : items.length ? "Nothing else planned today" : "Nothing planned today"}</span>
          </p>
          {items.length > 0 && (
            <p className="mt-1.5 font-normal">
              {done} of {items.length} done today
            </p>
          )}
        </>
      }
    >
      {drafting && <AutoRefresh />}

      {items.length === 0 ? (
        <section className="flex flex-col items-start gap-4 px-1 pt-2">
          <p className="text-lg font-semibold text-balance">Nothing on your route today.</p>
          <p className="text-muted">Type a task, a habit or a skill you want, and Stride fits it into your free time.</p>
          <Link href="/new" className={primaryButton}>
            <Icon name="plus" className="size-5" />
            Plan something
          </Link>
        </section>
      ) : (
        <ol aria-label="Today's route" className="route-draw">
          {items.map((item, i) => {
            const past = i < nowIndex;
            return (
              <Fragment key={item.id}>
                {i === nowIndex && <NowStop time={timeLocal(now, tz)} above={i === 0 ? "none" : "solid"} below="dashed" />}
                <Stop
                  item={item}
                  isNext={item.id === next?.id}
                  above={past ? (i === 0 ? "none" : "solid") : "dashed"}
                  below={past ? "solid" : i === items.length - 1 ? "none" : "dashed"}
                />
              </Fragment>
            );
          })}
          {nowIndex === items.length && <NowStop time={timeLocal(now, tz)} above="solid" below="none" />}
        </ol>
      )}

      {hasUpdates && (
        <section aria-labelledby="updates">
          <SectionTitle id="updates">Updates</SectionTitle>
          <div className={`${panel} divide-y divide-rule overflow-hidden`}>
          {(requests ?? []).map((r) => {
            const waiting = r.status === "queued" && now.getTime() - new Date(r.created_at).getTime() > 2 * 60_000;
            const line =
              r.status === "ready"
                ? "Your plan is ready to review"
                : r.status === "failed"
                  ? (r.error ?? "Couldn't draft this. Open it to try again.")
                  : waiting
                    ? "Waiting for your laptop to draft it"
                    : "Drafting your plan…";
            return (
              <Row key={r.id} href={`/requests/${r.id}`} icon={r.status === "ready" ? "check" : r.status === "failed" ? "alert" : "clock"} tone={r.status === "ready" ? "brand" : r.status === "failed" ? "risk" : "ink"}>
                <span className="block truncate font-semibold">{r.text}</span>
                <span className={`block text-sm ${r.status === "failed" ? "text-risk" : "text-muted"}`}>{line}</span>
              </Row>
            );
          })}
          {atRisk.map((p) => (
            <Row key={p.id} href={`/plans/${p.id}`} icon="alert" tone="risk">
              <span className="block font-semibold">{p.title} won&apos;t fit before its deadline</span>
              <span className="block text-sm text-muted">Give it more time or skip a step</span>
            </Row>
          ))}
          {offers.map((p) => {
            const levels = (p.plan as Extract<PlanDraft, { kind: "habit" }>).levels ?? [];
            return (
              <Row key={p.id} icon="up" tone="brand">
                <span className="block font-semibold">Great week on {p.title}</span>
                <span className="block text-sm text-muted">Ready for the next level: {levels[p.level + 1]?.label}?</span>
                <form action={answerLevelOffer} className="mt-2.5 flex gap-2">
                  <input type="hidden" name="id" value={p.id} />
                  <button name="answer" value="yes" className={`${primaryButton} px-4 py-2 text-sm`}>
                    Level up
                  </button>
                  <button name="answer" value="no" className={quietButton}>
                    Not yet
                  </button>
                </form>
              </Row>
            );
          })}
          {notes.map((p) => (
            <Row key={p.id} href={`/plans/${p.id}`} icon="today">
              <span className="block font-semibold">{p.title}</span>
              <span className="block text-sm text-muted">{p.level_note}</span>
            </Row>
          ))}
          {takeawayUrl && (recall ?? 0) > 0 && (
            <a href={`${takeawayUrl}/recall`} className="press flex items-start gap-3 px-4 py-3.5 hover:bg-ground/60">
              <span className="mt-0.5 text-brand">
                <Icon name="cards" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">
                  Recall {recall} {recall === 1 ? "card" : "cards"} in Takeaway
                </span>
                <span className="block text-sm text-muted">A few minutes so what you saved sticks</span>
              </span>
              <Icon name="external" className="mt-0.5 size-5 text-muted" />
            </a>
          )}
          {noFreeTime && (
            <Row href="/settings" icon="alert" tone="risk">
              <span className="block font-semibold">Add your free time</span>
              <span className="block text-sm text-muted">Tasks and study sessions need free time to go into</span>
            </Row>
          )}
          </div>
        </section>
      )}
    </Page>
  );
}
