import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

type SupabaseServerClient = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

async function getRestaurantId(supabase: SupabaseServerClient) {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: membership, error: membershipError } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError) {
    return { error: "Failed to load membership", status: 500 } as const;
  }

  if (!membership?.restaurant_id) {
    return { error: "No restaurant found", status: 400 } as const;
  }

  return { restaurantId: membership.restaurant_id as string } as const;
}

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient();

  let payload: { categoryId?: unknown; orderedIds?: unknown };
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  const { categoryId, orderedIds } = payload;

  if (!categoryId || typeof categoryId !== "string") {
    return NextResponse.json(
      { error: "categoryId is required" },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(orderedIds) ||
    orderedIds.length === 0 ||
    orderedIds.some((id) => typeof id !== "string" || id.trim() === "")
  ) {
    return NextResponse.json(
      { error: "orderedIds must be a non-empty array of strings" },
      { status: 400 }
    );
  }

  const membership = await getRestaurantId(supabase);
  if ("error" in membership) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status }
    );
  }

  const { restaurantId } = membership;

  const { data: existingItems, error: itemsError } = await supabase
    .from("items")
    .select("id")
    .eq("restaurant_id", restaurantId)
    .eq("category_id", categoryId);

  if (itemsError) {
    console.error("[ITEMS][REORDER] fetch error", itemsError);
    return NextResponse.json(
      { error: "Failed to load items" },
      { status: 500 }
    );
  }

  const validIds = new Set(existingItems?.map((item) => item.id));
  const invalidIds = orderedIds.filter((id) => !validIds.has(id));

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: "Items must belong to the same category and restaurant" },
      { status: 400 }
    );
  }

  for (let index = 0; index < orderedIds.length; index++) {
    const itemId = orderedIds[index];
    const { error: updateError } = await supabase
      .from("items")
      .update({ display_order: index })
      .eq("id", itemId)
      .eq("restaurant_id", restaurantId)
      .eq("category_id", categoryId);

    if (updateError) {
      console.error("[ITEMS][REORDER] update error", updateError);
      return NextResponse.json(
        { error: "Failed to save item order" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ success: true });
}
