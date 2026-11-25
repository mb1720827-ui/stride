import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import type { PlanDraft } from "@/lib/plans";
import { progress, routeStops, type ProgressItem } from "@/lib/progress";
import { Icon } from "../icons";
import { MiniRoute, Page, panel, primaryButton, SectionTitle } from "../ui";

const GROUPS = [
  { kind: "task", title: "Tasks" },
  { kind: "habit", title: "Habits" },
  { kind: "skill", title: "Skills" },
] as const;

export default function PlansPage() {
  return (
    <Suspense fallback={<Page title="Plans">{null}</Page>}>
      <PlansView />
    </Suspense>
  );
}

async function PlansView() {
  const { supabase } = await requireUser();
  await connection();
  const now = new Date();
  const settings = await loadSettings(supabase);
  const [{ data: plans }, { data: items }] = await Promise.all([
    supabase.from("stride_plans").select("id, kind, title, status, plan, level, milestone, at_risk").order("accepted_at", { ascending: false }),
    supabase
      .from("stride_items")
      .select("plan_id, starts_at, status, step")
      .not("plan_id", "is", null)
      .gte("starts_at", new Date(now.getTime() - 30 * 86_400_000).toISOString()),
  ]);
  const all = (items ?? []) as ProgressItem[];
  const live = (plans ?? []).filter((p) => p.status === "active" || p.status === "paused");
  const finished = (plans ?? []).filter((p) => p.status === "done" || p.status === "archived");

  const row = (p: NonNullable<typeof plans>[number]) => {
    const mine = all.filter((i) => i.plan_id === p.id);
    const past = mine.filter((i) => new Date(i.starts_at) <= now);
    const plan = p as typeof p & { plan: PlanDraft };
    return (
      <li key={p.id}>
        <Link href={`/plans/${p.id}`} className="press flex flex-col gap-2 px-4 py-4 hover:bg-ground/60">
          <span className="flex items-start gap-2">
            <span className="min-w-0 flex-1 leading-snug font-extrabold">{p.title}</span>
            {p.at_risk && <span className="text-sm font-extrabold text-risk">At risk</span>}
            {p.status !== "active" && <span className="text-sm font-semibold text-muted capitalize">{p.status}</span>}
            <Icon name="chevron" className="size-5 shrink-0 text-muted" />
          </span>
          <MiniRoute stops={routeStops(plan, mine, settings.time_zone, now)} label={progress(plan, past, settings.time_zone, now)} />
          <span className="text-[13px] text-muted">{progress(plan, past, settings.time_zone, now)}</span>
        </Link>
      </li>
    );
  };

  return (
    <Page title="Plans" guide={live.length ? `${live.length} on the go` : undefined}>
      {live.length === 0 ? (
        <section className="flex flex-col items-start gap-4 px-1">
          <p className="text-lg font-semibold">No plans yet.</p>
          <Link href="/new" className={primaryButton}>
            <Icon name="plus" className="size-5" />
            Plan something
          </Link>
        </section>
      ) : (
        GROUPS.map((g) => {
          const group = live.filter((p) => p.kind === g.kind);
          if (!group.length) return null;
          return (
            <section key={g.kind}>
              <SectionTitle>{g.title}</SectionTitle>
              <ul className={`${panel} divide-y divide-rule overflow-hidden`}>{group.map(row)}</ul>
            </section>
          );
        })
      )}
      {finished.length > 0 && (
        <details className="group">
          <summary className="press flex cursor-pointer list-none items-center gap-2 px-1 font-extrabold text-muted">
            <Icon name="chevron" className="size-5 transition-transform group-open:rotate-90 motion-reduce:transition-none" />
            Done and archived ({finished.length})
          </summary>
          <ul className={`${panel} mt-2 divide-y divide-rule overflow-hidden`}>{finished.map(row)}</ul>
        </details>
      )}
    </Page>
  );
}
