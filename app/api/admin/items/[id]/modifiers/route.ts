import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { enforceRateLimit } from "@/lib/api/rate-limit";

const assignSchema = z.object({
  modifierIds: z.array(z.string().uuid()).default([]),
});

async function getContext(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized", status: 401 as const };

  const { data: membership, error } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("[ITEM_MODIFIERS] membership error", error);
    return { error: "Failed to load membership", status: 500 as const };
  }
  if (!membership?.restaurant_id) {
    return { error: "No restaurant for this user", status: 400 as const };
  }

  return { restaurantId: membership.restaurant_id as string, userId: user.id };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: itemId } = await params;
  const supabase = await createSupabaseServerClient();
  const ctx = await getContext(supabase);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const rate = await enforceRateLimit(
    supabase,
    ctx.userId,
    "admin_item_modifiers_post"
  );
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const parsed = assignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, restaurant_id")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item || item.restaurant_id !== ctx.restaurantId) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  // Validate all modifiers belong to restaurant
  if (parsed.data.modifierIds.length) {
    const { data: modifiers, error: modError } = await supabase
      .from("modifiers")
      .select("id")
      .eq("restaurant_id", ctx.restaurantId)
      .in("id", parsed.data.modifierIds);

    if (modError) {
      console.error("[ITEM_MODIFIERS] modifier fetch error", modError);
      return NextResponse.json(
        { error: "Failed to validate modifiers" },
        { status: 500 }
      );
    }

    if ((modifiers ?? []).length !== parsed.data.modifierIds.length) {
      return NextResponse.json({ error: "Invalid modifier list" }, { status: 400 });
    }
  }

  await supabase.from("item_modifiers").delete().eq("item_id", itemId);

  if (parsed.data.modifierIds.length) {
    const inserts = parsed.data.modifierIds.map((modifierId) => ({
      item_id: itemId,
      modifier_id: modifierId,
    }));
    const { error: insertError } = await supabase.from("item_modifiers").insert(inserts);
    if (insertError) {
      console.error("[ITEM_MODIFIERS] insert error", insertError);
      return NextResponse.json({ error: "Failed to assign modifiers" }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
