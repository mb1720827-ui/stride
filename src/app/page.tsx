import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { aiFor, requireUser } from "@/lib/auth";
import { loadSettings, maintain } from "@/lib/maintain";
import type { PlanDraft } from "@/lib/plans";
import { addDays, localParts, timeLocal, zoned } from "@/lib/time";
import { answerLevelOffer, setItemStatus } from "./actions";
import { AutoRefresh } from "./auto-refresh";
import { ChatBox } from "./chat-box";
import { QuickAdd } from "./quick-add";
import { Badge, card, Header, Page, secondaryButton } from "./ui";

export default function Today({ searchParams }: PageProps<"/">) {
  return (
    <Page>
      <Header />
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <TodayView searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

const kindTone = { task: "sky", habit: "emerald", skill: "amber" } as const;

async function TodayView({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { supabase, user } = await requireUser();
  const { q } = await searchParams;
  await connection(); // "today" depends on the clock
  const now = new Date();
  const settings = await loadSettings(supabase);
  if (!settings.maintained_at || now.getTime() - new Date(settings.maintained_at).getTime() > 10 * 60_000) await maintain(supabase, now);

  const tz = settings.time_zone;
  const today = localParts(now, tz).date;
  const [{ data: itemData }, { data: requests }, { data: plans }] = await Promise.all([
    supabase
      .from("stride_items")
      .select("id, title, starts_at, minutes, status, url, plan:stride_plans(id, kind)")
      .gte("starts_at", zoned(today, 0, tz).toISOString())
      .lt("starts_at", zoned(addDays(today, 1), 0, tz).toISOString())
      .order("starts_at"),
    supabase
      .from("stride_requests")
      .select("id, text, status, kind, error, created_at")
      .in("status", ["queued", "processing", "ready", "failed"])
      .order("created_at", { ascending: false })
      .limit(10),
    supabase.from("stride_plans").select("id, kind, title, at_risk, level_offer, level_note, level, plan").eq("status", "active"),
  ]);
  const items = (itemData ?? []).map((i) => ({ ...i, plan: Array.isArray(i.plan) ? i.plan[0] : i.plan }));
  const done = items.filter((i) => i.status === "done").length;
  const drafting = (requests ?? []).some((r) => r.status === "queued" || r.status === "processing");
  const noFreeTime = Object.values(settings.free_blocks).every((b) => b.length === 0);
  const ai = aiFor(user.email);

  return (
    <>
      {drafting && <AutoRefresh />}
      <section className={card}>
        {ai ? (
          <ChatBox initial={typeof q === "string" ? q.slice(0, 1000) : undefined} />
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            AI planning only runs on the owner&apos;s copy of Stride for now. Use Quick add below for tasks and habits.
          </p>
        )}
      </section>

      {(requests ?? []).map((r) => {
        const waiting = r.status === "queued" && now.getTime() - new Date(r.created_at).getTime() > 2 * 60_000;
        return (
          <Link key={r.id} href={`/requests/${r.id}`} className={`${card} flex items-center justify-between gap-3 hover:border-emerald-400`}>
            <span className="min-w-0">
              <span className="block truncate font-medium">{r.text}</span>
              <span className="block text-sm text-zinc-500">
                {r.status === "ready"
                  ? "Plan ready. Review it →"
                  : r.status === "failed"
                    ? (r.error ?? "Something went wrong. Open to try again.")
                    : waiting
                      ? "Waiting for your laptop. It drafts plans while it's on."
                      : "Drafting your plan…"}
              </span>
            </span>
            <Badge tone={r.status === "ready" ? "emerald" : r.status === "failed" ? "rose" : "amber"}>{r.status === "ready" ? "ready" : r.status}</Badge>
          </Link>
        );
      })}

      {(plans ?? [])
        .filter((p) => p.at_risk)
        .map((p) => (
          <Link key={p.id} href={`/plans/${p.id}`} className="rounded-2xl border border-rose-300 bg-rose-50 p-4 text-rose-900 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-100">
            <span className="font-semibold">“{p.title}” is at risk.</span> Its steps no longer fit before the deadline. Open it to extend the
            deadline or drop a step →
          </Link>
        ))}

      {(plans ?? [])
        .filter((p) => p.level_offer || p.level_note)
        .map((p) => {
          const levels = (p.plan as Extract<PlanDraft, { kind: "habit" }>).levels ?? [];
          return (
            <section key={p.id} className={`${card} flex flex-col gap-2`}>
              {p.level_offer ? (
                <>
                  <p>
                    <span className="font-semibold">Great week on “{p.title}”.</span> Ready for the next level: {levels[p.level + 1]?.label}?
                  </p>
                  <form action={answerLevelOffer} className="flex gap-2">
                    <input type="hidden" name="id" value={p.id} />
                    <button name="answer" value="yes" className={secondaryButton}>
                      Yes, level up
                    </button>
                    <button name="answer" value="no" className={secondaryButton}>
                      Not yet
                    </button>
                  </form>
                </>
              ) : (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{p.title}:</span> {p.level_note}
                </p>
              )}
            </section>
          );
        })}

      <section className={card}>
        <div className="mb-3 flex items-baseline justify-between">
          <h1 className="text-lg font-semibold">Today</h1>
          <span className="text-sm text-zinc-500">
            {done} of {items.length} done
          </span>
        </div>
        {noFreeTime && (
          <p className="mb-3 text-sm text-amber-700 dark:text-amber-300">
            You haven&apos;t set any free time, so tasks and study sessions can&apos;t be scheduled.{" "}
            <Link href="/settings" className="underline">
              Add free time in Settings
            </Link>
            .
          </p>
        )}
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing planned today. Type a task, habit or skill above.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((i) => (
              <li key={i.id} className="flex items-center gap-3 py-2.5">
                <span className="w-12 shrink-0 font-mono text-sm text-zinc-500">{timeLocal(new Date(i.starts_at), tz)}</span>
                <span className="min-w-0 flex-1">
                  <Link href={i.plan ? `/plans/${i.plan.id}` : "/plans"} className={`block ${i.status === "done" ? "text-zinc-400 line-through" : ""} ${i.status === "skipped" || i.status === "missed" ? "text-zinc-400" : ""}`}>
                    {i.title}
                  </Link>
                  <span className="flex gap-1.5 text-xs text-zinc-500">
                    {i.plan && <Badge tone={kindTone[i.plan.kind as keyof typeof kindTone]}>{i.plan.kind}</Badge>}
                    {i.minutes} min{i.status === "missed" && " · missed"}
                    {i.status === "skipped" && " · skipped"}
                  </span>
                </span>
                <form action={setItemStatus} className="flex gap-1">
                  <input type="hidden" name="id" value={i.id} />
                  {i.status === "planned" || i.status === "missed" ? (
                    <>
                      <button name="status" value="done" aria-label={`Done: ${i.title}`} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700">
                        Done
                      </button>
                      <button name="status" value="skipped" aria-label={`Skip: ${i.title}`} className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        Skip
                      </button>
                    </>
                  ) : (
                    <button name="status" value="planned" className="rounded-lg px-2 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                      Undo
                    </button>
                  )}
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <details className={card}>
        <summary className="cursor-pointer font-semibold">Quick add (no AI)</summary>
        <div className="mt-3">
          <QuickAdd />
        </div>
      </details>
    </>
  );
}
