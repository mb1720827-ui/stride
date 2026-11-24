import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import { card, Header, Page } from "../ui";
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
  );
}
