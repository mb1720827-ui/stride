import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { deliver, sendPush, type DueRow } from "@/lib/push";

// Called every 5 minutes by Supabase pg_cron with the tick secret. The database decides what's due (and checks the
// secret); this route only sends the push notifications, so no admin key is needed.
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-tick-secret") ?? "";
  if (!secret) return NextResponse.json({ error: "missing secret" }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("stride_due_notifications", { p_secret: secret });
  if (error) return NextResponse.json({ error: error.code === "28000" ? "invalid secret" : "database error" }, { status: error.code === "28000" ? 401 : 500 });

  const result = await deliver((data ?? []) as DueRow[], sendPush);
  for (const endpoint of result.gone) await supabase.rpc("stride_drop_subscription", { p_secret: secret, p_endpoint: endpoint });
  return NextResponse.json({ sent: result.sent, dropped: result.gone.length, failed: result.failed });
}
