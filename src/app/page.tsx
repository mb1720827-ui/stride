import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { Header, Page } from "./ui";

export default function Today() {
  return (
    <Page>
      <Header />
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <TodayView />
      </Suspense>
    </Page>
  );
}

async function TodayView() {
  const { user } = await requireUser();
  return <p className="text-zinc-600 dark:text-zinc-400">Signed in as {user.email}.</p>;
}
