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

  const { data: sourceCategory, error: categoryError } = await supabase
    .from("categories")
    .select(
      `
      id,
      restaurant_id,
      name_en,
      name_ar,
      description_en,
      description_ar,
      image_url,
      is_visible,
      is_offers
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (categoryError || !sourceCategory) {
    return NextResponse.json(
      { error: "Category not found." },
      { status: 404 }
    );
  }

  if (sourceCategory.restaurant_id !== restaurantId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { data: maxCategoryOrder } = await supabase
    .from("categories")
    .select("display_order")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const newDisplayOrder = (maxCategoryOrder?.display_order ?? 0) + 1;

  const duplicatePayload = {
    restaurant_id: restaurantId,
    name_en: sourceCategory.name_en
      ? `${sourceCategory.name_en} (copy)`
      : sourceCategory.name_en,
    name_ar: sourceCategory.name_ar
      ? `${sourceCategory.name_ar} (copy)`
      : sourceCategory.name_ar,
    description_en: sourceCategory.description_en,
    description_ar: sourceCategory.description_ar,
    image_url: sourceCategory.image_url,
    is_visible: sourceCategory.is_visible,
    is_offers: sourceCategory.is_offers,
    display_order: newDisplayOrder,
  };

  const { data: newCategory, error: insertCategoryError } = await supabase
    .from("categories")
    .insert(duplicatePayload)
    .select("*")
    .single();

  if (insertCategoryError || !newCategory) {
    console.error("[CATEGORIES][DUPLICATE] insert error", insertCategoryError);
    return NextResponse.json(
      { error: "Failed to duplicate category." },
      { status: 500 }
    );
  }

  const { data: sourceItems, error: itemsError } = await supabase
    .from("items")
    .select(
      `
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
      image_url,
      is_new,
      is_popular,
      is_spicy,
      is_vegetarian,
      is_vegan,
      is_gluten_free,
      is_visible,
      is_available,
      item_code,
      display_order
    `
    )
    .eq("category_id", sourceCategory.id)
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true });

  if (itemsError) {
    console.error("[CATEGORIES][DUPLICATE] fetch items error", itemsError);
    return NextResponse.json(
      { error: "Category duplicated but items failed to copy." },
      { status: 500, category: newCategory }
    );
  }

  if (sourceItems && sourceItems.length > 0) {
    const insertItems = sourceItems.map((item) => ({
      restaurant_id: restaurantId,
      category_id: newCategory.id,
      name_en: item.name_en,
      name_ar: item.name_ar,
      description_en: item.description_en,
      description_ar: item.description_ar,
      price: item.price,
      secondary_price: item.secondary_price,
      primary_currency: item.primary_currency,
      secondary_currency: item.secondary_currency,
      image_url: item.image_url,
      is_new: item.is_new,
      is_popular: item.is_popular,
      is_spicy: item.is_spicy,
      is_vegetarian: item.is_vegetarian,
      is_vegan: item.is_vegan,
      is_gluten_free: item.is_gluten_free,
      is_visible: item.is_visible,
      is_available: item.is_available,
      item_code: item.item_code,
      display_order: item.display_order,
    }));

    const { error: insertItemsError } = await supabase
      .from("items")
      .insert(insertItems);

    if (insertItemsError) {
      console.error(
        "[CATEGORIES][DUPLICATE] insert items error",
        insertItemsError
      );
      return NextResponse.json(
        {
          error: "Category duplicated, but items failed to copy.",
          category: newCategory,
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ category: newCategory }, { status: 201 });
}
