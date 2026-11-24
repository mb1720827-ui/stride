import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import { progress, type ProgressItem } from "@/lib/progress";
import { Badge, card, Header, Page } from "../ui";

export default function PlansPage() {
  return (
    <Page>
      <Header />
      <h1 className="text-2xl font-bold tracking-tight">Plans</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <PlansView />
      </Suspense>
    </Page>
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
      .gte("starts_at", new Date(now.getTime() - 30 * 86_400_000).toISOString())
      .lte("starts_at", now.toISOString()),
  ]);
  const active = (plans ?? []).filter((p) => p.status === "active" || p.status === "paused");
  const finished = (plans ?? []).filter((p) => p.status === "done" || p.status === "archived");

  const row = (p: NonNullable<typeof plans>[number]) => (
    <li key={p.id}>
      <Link href={`/plans/${p.id}`} className="flex flex-col gap-1 py-3 hover:opacity-80">
        <span className="flex flex-wrap items-center gap-2">
          <Badge tone={p.kind === "task" ? "sky" : p.kind === "habit" ? "emerald" : "amber"}>{p.kind}</Badge>
          <span className="font-medium">{p.title}</span>
          {p.status === "paused" && <Badge>paused</Badge>}
          {p.at_risk && <Badge tone="rose">at risk</Badge>}
        </span>
        <span className="text-sm text-zinc-500">
          {progress(p, ((items ?? []) as ProgressItem[]).filter((i) => i.plan_id === p.id), settings.time_zone, now)}
        </span>
      </Link>
    </li>
  );

  return (
    <>
      <section className={card}>
        {active.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No plans yet.{" "}
            <Link href="/" className="underline">
              Type one on Today
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">{active.map(row)}</ul>
        )}
      </section>
      {finished.length > 0 && (
        <details className={card}>
          <summary className="cursor-pointer font-semibold">Done and archived ({finished.length})</summary>
          <ul className="mt-2 divide-y divide-zinc-200 dark:divide-zinc-800">{finished.map(row)}</ul>
        </details>
      )}
    </>
  );
}
