// app/admin/menu/items/page.tsx

import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { normalizeBranchSlugs } from "@/lib/branch-slug";
import ItemsClient from "./components/items-client";

type BranchRecord = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export default async function ItemsPage() {
  const supabase = await createSupabaseServerClient();

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

  const inferredRestaurantId =
    categories[0]?.restaurant_id ?? items[0]?.restaurant_id ?? null;

  let restaurantSlug: string | null = null;
  let branches: BranchRecord[] = [];
  let restaurantDefaultLanguage: "en" | "ar" | "both" | null = "en";

  if (inferredRestaurantId) {
    const [{ data: restaurantRecord }, { data: branchData }] = await Promise.all([
      supabase
        .from("restaurants")
        .select("slug, default_language")
        .eq("id", inferredRestaurantId)
        .maybeSingle(),
      supabase
        .from("branches")
        .select("id, name, slug, is_active")
        .eq("restaurant_id", inferredRestaurantId)
        .order("name", { ascending: true }),
    ]);

    restaurantSlug = restaurantRecord?.slug ?? null;
    restaurantDefaultLanguage =
      (restaurantRecord?.default_language as "en" | "ar" | "both" | null) ?? "en";

    const normalizedBranchRows = await normalizeBranchSlugs(
      supabase,
      (branchData ?? []) as Array<{
        id: string;
        name: string | null;
        slug: string | null;
      }>
    );

    branches = normalizedBranchRows.map((branch) => ({
      id: branch.id,
      name: branch.name,
      slug: branch.slug ?? "",
      is_active: branch.is_active ?? true,
    }));
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
        <ItemsClient
          categories={categories}
          items={items}
          branches={branches}
          restaurantSlug={restaurantSlug}
          restaurantDefaultLanguage={restaurantDefaultLanguage}
        />
      </div>
    </div>
  );
}
