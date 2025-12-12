import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

const bodySchema = z.object({
  sessionId: z.string().min(1),
  itemId: z.string().uuid(),
});

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { sessionId, itemId } = parsed.data;

  const { error } = await supabase
    .from("customer_favorites")
    .delete()
    .eq("session_id", sessionId)
    .eq("item_id", itemId);

  if (error) {
    console.error("[favorites] remove error", error);
    return NextResponse.json({ error: "Failed to remove favorite" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
