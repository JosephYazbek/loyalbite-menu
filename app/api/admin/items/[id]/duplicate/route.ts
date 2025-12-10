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

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createSupabaseServerClient();
  const { id } = await params;

  const membership = await getRestaurantId(supabase);
  if ("error" in membership) {
    return NextResponse.json(
      { error: membership.error },
      { status: membership.status }
    );
  }

  const { restaurantId } = membership;

  const { data: sourceItem, error: fetchError } = await supabase
    .from("items")
    .select(
      `
      id,
      restaurant_id,
      category_id,
      name_en,
      name_ar,
      description_en,
      description_ar,
      price,
      secondary_price,
      primary_currency,
      secondary_currency,
      calories,
      image_url,
      is_new,
      is_popular,
      is_spicy,
      is_vegetarian,
      is_vegan,
      is_gluten_free,
      is_visible,
      is_available,
      item_code
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (fetchError || !sourceItem) {
    return NextResponse.json(
      { error: "Item not found." },
      { status: 404 }
    );
  }

  if (sourceItem.restaurant_id !== restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: maxOrderRow } = await supabase
    .from("items")
    .select("display_order")
    .eq("restaurant_id", restaurantId)
    .eq("category_id", sourceItem.category_id)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newDisplayOrder = (maxOrderRow?.display_order ?? 0) + 1;

  const duplicatePayload = {
    restaurant_id: restaurantId,
    category_id: sourceItem.category_id,
    name_en: sourceItem.name_en
      ? `${sourceItem.name_en} (copy)`
      : sourceItem.name_en,
    name_ar: sourceItem.name_ar
      ? `${sourceItem.name_ar} (copy)`
      : sourceItem.name_ar,
    description_en: sourceItem.description_en,
    description_ar: sourceItem.description_ar,
    price: sourceItem.price,
    secondary_price: sourceItem.secondary_price,
    primary_currency: sourceItem.primary_currency,
    secondary_currency: sourceItem.secondary_currency,
    calories: sourceItem.calories,
    image_url: sourceItem.image_url,
    is_new: sourceItem.is_new,
    is_popular: sourceItem.is_popular,
    is_spicy: sourceItem.is_spicy,
    is_vegetarian: sourceItem.is_vegetarian,
    is_vegan: sourceItem.is_vegan,
    is_gluten_free: sourceItem.is_gluten_free,
    is_visible: sourceItem.is_visible,
    is_available: sourceItem.is_available,
    item_code: sourceItem.item_code,
    display_order: newDisplayOrder,
  };

  const { data: newItem, error: insertError } = await supabase
    .from("items")
    .insert(duplicatePayload)
    .select("*")
    .single();

  if (insertError) {
    console.error("[ITEMS][DUPLICATE] insert error", insertError);
    return NextResponse.json(
      { error: "Failed to duplicate item." },
      { status: 500 }
    );
  }

  return NextResponse.json({ item: newItem }, { status: 201 });
}
