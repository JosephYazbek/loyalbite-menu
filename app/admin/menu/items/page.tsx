// app/admin/menu/items/page.tsx
import { redirect } from "next/navigation";
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.restaurant_id) {
    redirect("/onboarding");
  }

  const restaurantId = membership.restaurant_id;

  const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
    supabase
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
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
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
        item_code,
        display_order,
        created_at,
        updated_at
      `
      )
      .eq("restaurant_id", restaurantId)
      .order("display_order", { ascending: true }),
  ]);

  const categories = categoriesData ?? [];
  const items = itemsData ?? [];

  const [{ data: restaurantRecord }, { data: branchData }] = await Promise.all([
    supabase
      .from("restaurants")
      .select("slug, default_language")
      .eq("id", restaurantId)
      .maybeSingle(),
    supabase
      .from("branches")
      .select("id, name, slug, is_active")
      .eq("restaurant_id", restaurantId)
      .order("name", { ascending: true }),
  ]);

  const restaurantSlug = restaurantRecord?.slug ?? null;
  const restaurantDefaultLanguage =
    (restaurantRecord?.default_language as "en" | "ar" | "both" | null) ?? "en";

  const normalizedBranchRows = await normalizeBranchSlugs(
    supabase,
    (branchData ?? []) as Array<{
      id: string;
      name: string | null;
      slug: string | null;
    }>
  );

  const branches: BranchRecord[] = normalizedBranchRows.map((branch) => ({
    id: branch.id,
    name: branch.name,
    slug: branch.slug ?? "",
    is_active: branch.is_active ?? true,
  }));

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
