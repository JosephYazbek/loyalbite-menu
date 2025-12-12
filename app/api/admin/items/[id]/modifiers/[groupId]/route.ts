import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { enforceRateLimit } from "@/lib/api/rate-limit";

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

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; groupId: string }> }
) {
  const { id: itemId, groupId } = await params;
  const supabase = await createSupabaseServerClient();
  const ctx = await getContext(supabase);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const rate = await enforceRateLimit(
    supabase,
    ctx.userId,
    "admin_item_modifiers_delete"
  );
  if (!rate.ok) {
    return NextResponse.json({ error: rate.message }, { status: rate.status });
  }

  const { data: item, error: itemError } = await supabase
    .from("items")
    .select("id, restaurant_id")
    .eq("id", itemId)
    .maybeSingle();

  if (itemError || !item || item.restaurant_id !== ctx.restaurantId) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const { data: modifier, error: modError } = await supabase
    .from("modifiers")
    .select("id, restaurant_id")
    .eq("id", groupId)
    .maybeSingle();

  if (modError || !modifier || modifier.restaurant_id !== ctx.restaurantId) {
    return NextResponse.json({ error: "Modifier not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("item_modifiers")
    .delete()
    .eq("item_id", itemId)
    .eq("modifier_id", groupId);

  if (error) {
    console.error("[ITEM_MODIFIERS] delete error", error);
    return NextResponse.json({ error: "Failed to remove modifier" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
