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

  // Validate item exists
  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("customer_favorites")
    .upsert({ session_id: sessionId, item_id: itemId }, { onConflict: "session_id,item_id" });

  if (error) {
    console.error("[favorites] add error", error);
    return NextResponse.json({ error: "Failed to save favorite" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
