import { Suspense } from "react";
import { requireUser } from "@/lib/auth";
import { loadSettings } from "@/lib/maintain";
import { signOut } from "../actions";
import { Page, panel, quietButton, SectionTitle } from "../ui";
import { CalendarLink } from "./calendar-link";
import { PushToggle } from "./push-toggle";
import { SettingsForm } from "./settings-form";

export default function SettingsPage() {
  return (
    <Suspense fallback={<Page title="Settings">{null}</Page>}>
      <SettingsView />
    </Suspense>
  );
}

async function SettingsView() {
  const { supabase, user } = await requireUser();
  const s = await loadSettings(supabase);
  return (
    <Page title="Settings" guide={user.email}>
      <section>
        <SectionTitle>Notifications</SectionTitle>
        <div className={`${panel} flex flex-col gap-3 p-4`}>
          <p className="text-sm text-muted">A morning brief, a reminder as each thing starts, and an evening check-in. Quiet hours and a daily limit keep it calm.</p>
          <PushToggle publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""} />
        </div>
      </section>

      <SettingsForm
        values={{
          time_zone: s.time_zone,
          wake: s.wake,
          sleep: s.sleep,
          quiet_start: s.quiet_start,
          quiet_end: s.quiet_end,
          daily_cap: s.daily_cap,
          free_blocks: s.free_blocks,
        }}
      />

      <section>
        <SectionTitle>Calendar</SectionTitle>
        <div className={`${panel} flex flex-col gap-3 p-4`}>
          <p className="text-sm text-muted">See your Stride plan in Google or Apple Calendar with a private link.</p>
          <CalendarLink hasLink={Boolean(s.calendar_token_hash)} />
        </div>
      </section>

      <form action={signOut} className="flex justify-center">
        <button className={quietButton}>Sign out</button>
      </form>
    </Page>
  );
}
