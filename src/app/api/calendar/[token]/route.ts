import { createClient } from "@supabase/supabase-js";
import { connection, type NextRequest } from "next/server";
import { toIcs } from "@/lib/ics";

// The private calendar feed. The token in the URL is the only key; the database stores just its SHA-256 hash.
export async function GET(_request: NextRequest, { params }: RouteContext<"/api/calendar/[token]">) {
  await connection();
  const token = (await params).token.replace(/\.ics$/, "");
  if (!/^[a-f0-9]{64}$/.test(token)) return new Response("Not found", { status: 404 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false },
  });
  const { data, error } = await supabase.rpc("stride_calendar", { p_token: token });
  if (error) return new Response("Calendar unavailable", { status: 500 });
  return new Response(toIcs(data ?? [], new Date()), {
    headers: { "Content-Type": "text/calendar; charset=utf-8", "Cache-Control": "private, max-age=300" },
  });
}
