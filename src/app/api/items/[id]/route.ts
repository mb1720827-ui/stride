import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const Body = z.object({ status: z.enum(["done", "skipped"]) });

// The Done / Skip buttons on a reminder (public/sw.js). Same-origin only; row-level security limits it to your own items.
export async function POST(request: NextRequest, { params }: RouteContext<"/api/items/[id]">) {
  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { id } = await params;
  const parsedId = z.uuid().safeParse(id);
  const body = Body.safeParse(await request.json().catch(() => null));
  if (!parsedId.success || !body.success) return NextResponse.json({ error: "bad request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "sign in first" }, { status: 401 });
  const { error } = await supabase
    .from("stride_items")
    .update({ status: body.data.status, done_at: body.data.status === "done" ? new Date().toISOString() : null })
    .eq("id", parsedId.data);
  return NextResponse.json({ ok: !error }, { status: error ? 500 : 200 });
}
