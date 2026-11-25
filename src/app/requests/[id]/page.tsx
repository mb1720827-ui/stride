import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import { Draft, milestones, Quiz, type DraftT } from "@/lib/plans";
import { formatLocal } from "@/lib/time";
import { acceptRequest, changeRequest, discardRequest, submitQuiz } from "../../actions";
import { AutoRefresh } from "../../auto-refresh";
import { Icon } from "../../icons";
import { Resources } from "../../resources";
import { RouteList } from "../../route-list";
import { input, Page, panel, primaryButton, quietButton, secondaryButton, SectionTitle } from "../../ui";

export default function RequestPage({ params }: PageProps<"/requests/[id]">) {
  return (
    <Suspense fallback={<Page title="Your plan" back={{ href: "/", label: "Today" }}>{null}</Page>}>
      <RequestView params={params} />
    </Suspense>
  );
}

async function RequestView({ params }: Pick<PageProps<"/requests/[id]">, "params">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: req } = await supabase.from("stride_requests").select("id, text, status, kind, draft, error, plan_id").eq("id", id).maybeSingle();
  if (!req) notFound();
  const settings = await loadSettings(supabase);
  const back = { href: "/", label: "Today" };
  const asked = <>You asked: “{req.text}”</>;

  if (req.status === "queued" || req.status === "processing") {
    return (
      <Page title="Drafting your plan" back={back} guide={asked}>
        <AutoRefresh />
        <section className={`${panel} flex flex-col gap-4 p-5`}>
          <div className="relative h-4 w-24 [--track-w:96px]" aria-hidden="true">
            <span className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 border-t-4 border-dashed border-brand" />
            <span className="travel absolute top-0 left-0 size-4 rounded-full border-4 border-ink bg-here" />
          </div>
          <p className="font-semibold">Your laptop is working on it.</p>
          <p className="text-muted">This usually takes under a minute while your laptop is on. The page updates by itself.</p>
        </section>
      </Page>
    );
  }

  if (req.status === "failed") {
    return (
      <Page title="Couldn't draft this" back={back} guide={asked}>
        <section className={`${panel} flex flex-col gap-4 p-5`}>
          <p className="text-risk">{req.error ?? "Something went wrong."}</p>
          <form action={changeRequest}>
            <input type="hidden" name="id" value={req.id} />
            <button className={primaryButton}>Try again</button>
          </form>
        </section>
      </Page>
    );
  }

  if (req.status === "accepted" || req.status === "discarded") {
    return (
      <Page title={req.status === "accepted" ? "Plan accepted" : "Plan discarded"} back={back} guide={asked}>
        <Link href={req.plan_id ? `/plans/${req.plan_id}` : "/"} className={`${primaryButton} self-start`}>
          {req.plan_id ? "Open the plan" : "Back to Today"}
        </Link>
      </Page>
    );
  }

  if (req.kind === "quiz") {
    const quiz = Quiz.safeParse(req.draft);
    if (!quiz.success)
      return (
        <Page title="Quiz" back={back}>
          <p className="text-risk">This quiz couldn&apos;t be read. Ask for a new one from the plan page.</p>
        </Page>
      );
    return (
      <Page title="Milestone quiz" back={back} guide="5 questions. Get 4 right to move to the next milestone.">
        <form action={submitQuiz} className="flex flex-col gap-6">
          <input type="hidden" name="id" value={req.id} />
          {quiz.data.questions.map((q, i) => (
            <fieldset key={i} className={`${panel} flex flex-col gap-2 p-4`}>
              <legend className="sr-only">Question {i + 1}</legend>
              <p className="mb-1 font-extrabold leading-snug">
                <span className="tnum text-brand">{i + 1}.</span> {q.q}
              </p>
              {q.options.map((o, j) => (
                <label key={j} className="press flex cursor-pointer items-start gap-3 rounded-xl border-2 border-field px-3 py-2.5 has-checked:border-brand has-checked:bg-track">
                  <input type="radio" name={`q${i}`} value={j} required className="mt-1 size-4 accent-brand" />
                  <span>{o}</span>
                </label>
              ))}
            </fieldset>
          ))}
          <button className={primaryButton}>Check my answers</button>
        </form>
      </Page>
    );
  }

  const parsed = Draft.safeParse(req.draft);
  if (!parsed.success)
    return (
      <Page title="Your plan" back={back}>
        <p className="text-risk">This draft couldn&apos;t be read. Ask for changes to get a new one.</p>
      </Page>
    );
  const draft = parsed.data;
  return (
    <Page title={draft.kind === "command" ? "Change a plan" : draft.title} back={back} guide={asked}>
      <section className={`${panel} p-4 pt-5`}>
        <DraftView draft={draft} tz={settings.time_zone} />
      </section>

      <section className="flex flex-col gap-3">
        <form action={acceptRequest}>
          <input type="hidden" name="id" value={req.id} />
          <button className={`${primaryButton} w-full py-4`}>
            <Icon name="check" className="size-5" />
            {draft.kind === "command" ? "Do it" : "Accept and schedule"}
          </button>
        </form>
        <form action={changeRequest} className={`${panel} flex flex-col gap-2.5 p-4`}>
          <input type="hidden" name="id" value={req.id} />
          <label htmlFor="feedback" className="font-extrabold">
            Want it different?
          </label>
          <textarea id="feedback" name="feedback" rows={2} required className={`${input} resize-none`} placeholder="Fewer steps, mornings only, more practice…" />
          <button className={`${secondaryButton} self-start`}>Redraft</button>
        </form>
      </section>

      {/* Discarding stands apart from accepting, never next to it. */}
      <form action={discardRequest} className="mt-4 flex justify-center">
        <input type="hidden" name="id" value={req.id} />
        <button className={quietButton}>Discard this plan</button>
      </form>
    </Page>
  );
}

function DraftView({ draft, tz }: { draft: DraftT; tz: string }) {
  if (draft.kind === "command") return <p className="text-lg font-semibold">{draft.summary}</p>;

  if (draft.kind === "task") {
    const total = draft.steps.reduce((n, s) => n + s.minutes, 0);
    return (
      <>
        <p className="mb-4 px-1 text-sm text-muted">
          {draft.steps.length} steps ∙ {Math.round(total / 6) / 10} hours in your free time, with room to spare before the deadline.
        </p>
        <RouteList
          label="Steps"
          stops={[
            ...draft.steps.map((s, i) => ({
              key: String(i),
              label: i + 1,
              title: s.title,
              sub: `${s.minutes} min${s.optional ? " ∙ optional" : ""}`,
              minutes: s.minutes,
            })),
            { key: "due", label: "Due", title: formatLocal(new Date(draft.deadline), tz), terminus: true },
          ]}
        />
      </>
    );
  }

  if (draft.kind === "habit") {
    return (
      <>
        <RouteList
          label="Levels"
          stops={draft.levels.map((l, i) => ({ key: String(i), label: `L${i + 1}`, title: l.label, sub: i === 0 ? "You start here" : undefined, state: i === 0 ? "planned" : undefined }))}
        />
        <dl className="mt-2 grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-3 gap-y-3 border-t border-rule px-1 pt-4 text-sm">
          <dt className="font-semibold text-muted">When</dt>
          <dd>
            {draft.window.start}–{draft.window.end}, {draft.minutes} min
          </dd>
          <dt className="font-semibold text-muted">Trigger</dt>
          <dd>{draft.trigger}</dd>
          <dt className="font-semibold text-muted">Bad day</dt>
          <dd>{draft.minimum}</dd>
          <dt className="font-semibold text-muted">If you miss</dt>
          <dd>{draft.recovery}</dd>
        </dl>
      </>
    );
  }

  const all = milestones(draft);
  return (
    <>
      <p className="mb-4 px-1 text-sm text-muted">
        {draft.sessions_per_week} sessions a week, {draft.minutes} min each ∙ {all.length} milestones, each with a 5-question quiz
      </p>
      <RouteList
        label="Roadmap"
        stops={draft.stages.flatMap((stage, si) => [
          { key: `s${si}`, title: stage.name, heading: true },
          ...stage.milestones.map((m, mi) => ({
            key: `m${si}-${mi}`,
            label: `${m.weeks}w`,
            title: m.title,
            sub: m.topics.join(" ∙ "),
            terminus: si === draft.stages.length - 1 && mi === stage.milestones.length - 1,
          })),
        ])}
      />
      {draft.resources && draft.resources.length > 0 && (
        <div className="mt-2 border-t border-rule pt-4">
          <SectionTitle>Free resources, links checked</SectionTitle>
          <Resources resources={draft.resources} stages={draft.stages.map((s) => s.name)} />
        </div>
      )}
    </>
  );
}
