import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { Draft, milestones, Quiz, type DraftT } from "@/lib/plans";
import { formatLocal } from "@/lib/time";
import { loadSettings } from "@/lib/maintain";
import { acceptRequest, changeRequest, discardRequest, submitQuiz } from "../../actions";
import { AutoRefresh } from "../../auto-refresh";
import { Resources } from "../../resources";
import { Badge, card, Header, input, Page, primaryButton, secondaryButton } from "../../ui";

export default function RequestPage({ params }: PageProps<"/requests/[id]">) {
  return (
    <Page>
      <Header />
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <RequestView params={params} />
      </Suspense>
    </Page>
  );
}

async function RequestView({ params }: Pick<PageProps<"/requests/[id]">, "params">) {
  const { id } = await params;
  const { supabase } = await requireUser();
  const { data: req } = await supabase.from("stride_requests").select("id, text, status, kind, draft, error, plan_id").eq("id", id).maybeSingle();
  if (!req) notFound();
  const settings = await loadSettings(supabase);

  const heading = (
    <div>
      <p className="text-sm text-zinc-500">You asked</p>
      <h1 className="text-xl font-semibold">“{req.text}”</h1>
    </div>
  );

  if (req.status === "queued" || req.status === "processing") {
    return (
      <>
        <AutoRefresh />
        {heading}
        <section className={card}>
          <p className="font-medium">Drafting your plan…</p>
          <p className="mt-1 text-sm text-zinc-500">This usually takes under a minute while your laptop is on. This page updates by itself.</p>
        </section>
      </>
    );
  }

  if (req.status === "failed") {
    return (
      <>
        {heading}
        <section className={`${card} flex flex-col gap-3`}>
          <p className="text-rose-600">{req.error ?? "Something went wrong."}</p>
          <form action={changeRequest}>
            <input type="hidden" name="id" value={req.id} />
            <button className={primaryButton}>Try again</button>
          </form>
        </section>
      </>
    );
  }

  if (req.status === "accepted" || req.status === "discarded") {
    return (
      <>
        {heading}
        <section className={card}>
          <p>
            {req.status === "accepted" ? "Accepted. " : "Discarded. "}
            {req.plan_id ? (
              <Link href={`/plans/${req.plan_id}`} className="underline">
                Open the plan
              </Link>
            ) : (
              <Link href="/" className="underline">
                Back to Today
              </Link>
            )}
          </p>
        </section>
      </>
    );
  }

  if (req.kind === "quiz") {
    const quiz = Quiz.safeParse(req.draft);
    if (!quiz.success) return <p className="text-rose-600">This quiz couldn&apos;t be read. Request a new one from the plan page.</p>;
    return (
      <>
        {heading}
        <form action={submitQuiz} className={`${card} flex flex-col gap-5`}>
          <input type="hidden" name="id" value={req.id} />
          {quiz.data.questions.map((q, i) => (
            <fieldset key={i} className="flex flex-col gap-2">
              <legend className="mb-1 font-medium">
                {i + 1}. {q.q}
              </legend>
              {q.options.map((o, j) => (
                <label key={j} className="flex items-start gap-2">
                  <input type="radio" name={`q${i}`} value={j} required className="mt-1" />
                  {o}
                </label>
              ))}
            </fieldset>
          ))}
          <button className={`${primaryButton} self-start`}>Check my answers</button>
        </form>
      </>
    );
  }

  const parsed = Draft.safeParse(req.draft);
  if (!parsed.success) return <p className="text-rose-600">This draft couldn&apos;t be read. Ask for changes to get a new one.</p>;
  return (
    <>
      {heading}
      <section className={`${card} flex flex-col gap-4`}>
        <DraftView draft={parsed.data} tz={settings.time_zone} />
      </section>
      <section className={`${card} flex flex-col gap-3`}>
        <form action={acceptRequest} className="flex gap-2">
          <input type="hidden" name="id" value={req.id} />
          <button className={primaryButton}>{parsed.data.kind === "command" ? "Do it" : "Accept and schedule"}</button>
        </form>
        <form action={changeRequest} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={req.id} />
          <label htmlFor="feedback" className="text-sm font-medium">
            Or say what to change
          </label>
          <textarea id="feedback" name="feedback" rows={2} required className={input} placeholder="Fewer steps, mornings only, add more practice…" />
          <button className={`${secondaryButton} self-start`}>Redraft</button>
        </form>
        <form action={discardRequest}>
          <input type="hidden" name="id" value={req.id} />
          <button className="text-sm text-zinc-500 underline">Discard</button>
        </form>
      </section>
    </>
  );
}

function DraftView({ draft, tz }: { draft: DraftT; tz: string }) {
  if (draft.kind === "command") return <p className="text-lg">{draft.summary}</p>;
  const title = (
    <div className="flex items-center gap-2">
      <Badge tone={draft.kind === "task" ? "sky" : draft.kind === "habit" ? "emerald" : "amber"}>{draft.kind}</Badge>
      <h2 className="text-lg font-semibold">{draft.title}</h2>
    </div>
  );

  if (draft.kind === "task") {
    return (
      <>
        {title}
        <p className="text-sm text-zinc-500">Due {formatLocal(new Date(draft.deadline), tz)}</p>
        <ol className="flex list-decimal flex-col gap-1 pl-5">
          {draft.steps.map((s, i) => (
            <li key={i}>
              {s.title} <span className="text-sm text-zinc-500">· {s.minutes} min{s.optional && " · optional"}</span>
            </li>
          ))}
        </ol>
        <p className="text-sm text-zinc-500">Steps go into your free time, leaving a buffer before the deadline.</p>
      </>
    );
  }

  if (draft.kind === "habit") {
    return (
      <>
        {title}
        <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500">Levels</dt>
          <dd>
            <ol className="list-decimal pl-5">
              {draft.levels.map((l, i) => (
                <li key={i}>{l.label}</li>
              ))}
            </ol>
          </dd>
          <dt className="text-zinc-500">When</dt>
          <dd>
            Between {draft.window.start} and {draft.window.end}, {draft.minutes} min
          </dd>
          <dt className="text-zinc-500">Trigger</dt>
          <dd>{draft.trigger}</dd>
          <dt className="text-zinc-500">Bad day</dt>
          <dd>{draft.minimum}</dd>
          <dt className="text-zinc-500">If you miss</dt>
          <dd>{draft.recovery}</dd>
        </dl>
      </>
    );
  }

  return (
    <>
      {title}
      <p className="text-sm text-zinc-500">
        {draft.sessions_per_week} sessions a week, {draft.minutes} min each
      </p>
      <ol className="flex flex-col gap-3">
        {draft.stages.map((s, i) => (
          <li key={i}>
            <p className="font-medium">{s.name}</p>
            <ul className="mt-1 flex list-disc flex-col gap-0.5 pl-5 text-sm">
              {s.milestones.map((m, j) => (
                <li key={j}>
                  {m.title} <span className="text-zinc-500">· {m.weeks} wk · {m.topics.join(", ")}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>
      <p className="text-sm text-zinc-500">{milestones(draft).length} milestones, each with a 5-question quiz.</p>
      {draft.resources && draft.resources.length > 0 && <Resources resources={draft.resources} />}
    </>
  );
}
