import { Suspense } from "react";
import { aiFor, requireUser } from "@/lib/auth";
import { ChatBox } from "../chat-box";
import { QuickAdd } from "../quick-add";
import { Page, panel, SectionTitle } from "../ui";

export default function NewPlanPage({ searchParams }: PageProps<"/new">) {
  return (
    <Page title="Plan something new" back={{ href: "/", label: "Today" }} guide="Say it in plain words. Nothing is scheduled until you accept the plan.">
      <Suspense fallback={null}>
        <NewPlan searchParams={searchParams} />
      </Suspense>
    </Page>
  );
}

async function NewPlan({ searchParams }: Pick<PageProps<"/new">, "searchParams">) {
  const { user } = await requireUser();
  const { q } = await searchParams;
  const ai = aiFor(user.email);
  return (
    <>
      {ai ? (
        <section className={`${panel} p-4`}>
          <ChatBox initial={typeof q === "string" ? q.slice(0, 1000) : undefined} />
        </section>
      ) : (
        <p className="px-1 text-muted">AI planning only runs on the owner&apos;s copy of Stride for now. Add tasks and habits yourself below.</p>
      )}
      <section>
        <SectionTitle>{ai ? "Or add it yourself" : "Add it yourself"}</SectionTitle>
        <div className={`${panel} p-4`}>
          <QuickAdd />
        </div>
      </section>
    </>
  );
}
