import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import { card, Header, Page } from "../ui";
import { PushToggle } from "./push-toggle";
import { SettingsForm } from "./settings-form";

export default function SettingsPage() {
  return (
    <Page>
      <Header />
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      <Suspense fallback={<p className="text-zinc-500">Loading…</p>}>
        <SettingsView />
      </Suspense>
    </Page>
  );
}

async function SettingsView() {
  const { supabase } = await requireUser();
  const s = await loadSettings(supabase);
  return (
    <>
    <section className={`${card} flex flex-col gap-2`}>
      <h2 className="font-semibold">Notifications</h2>
      <p className="text-sm text-zinc-500">A morning brief, a reminder when each thing starts and an evening check-in. Quiet hours and a daily limit keep it calm.</p>
      <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
    </section>
    <section className={card}>
      <SettingsForm
        values={{
          time_zone: s.time_zone,
          wake: s.wake ?? "06:00",
          sleep: s.sleep ?? "22:30",
          quiet_start: s.quiet_start ?? "22:30",
          quiet_end: s.quiet_end ?? "06:30",
          daily_cap: s.daily_cap ?? 8,
          free_blocks: s.free_blocks,
        }}
      />
    </section>
    </>
  );
}
