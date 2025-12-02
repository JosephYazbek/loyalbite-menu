// app/admin/menu/items/page.tsx

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import ItemsClient from "./components/items-client";

export default async function ItemsPage() {
  const supabase = await createSupabaseServerClient();

  // Load categories (for dropdown + grouping)
  const { data: categoriesData } = await supabase
    .from("categories")
    .select(
      `
      id,
      restaurant_id,
      name_en,
      name_ar,
      description_en,
      description_ar,
      is_visible,
      is_offers,
      display_order
    `
    )
    .order("display_order", { ascending: true });

  // Load items
  const { data: itemsData } = await supabase
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
      display_order,
      created_at,
      updated_at
    `
    )
    .order("display_order", { ascending: true });

  const categories = categoriesData ?? [];
  const items = itemsData ?? [];

  return <ItemsClient categories={categories} items={items} />;
}
