import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { MenuClient } from "./menu-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    restaurantSlug: string;
    branchSlug: string;
  }>;
};

type CategoryRecord = {
  id: string;
  name_en: string | null;
  description_en: string | null;
  display_order: number | null;
};

type ItemRecord = {
  id: string;
  category_id: string;
  name_en: string | null;
  description_en: string | null;
  price: number | string | null;
  secondary_price: number | string | null;
  primary_currency: string | null;
  secondary_currency: string | null;
  image_url: string | null;
  is_new: boolean | null;
  is_popular: boolean | null;
  is_spicy: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  display_order: number | null;
};

export default async function BranchPublicMenuPage({ params }: PageProps) {
  const { restaurantSlug, branchSlug } = await params;
  noStore();
  const supabase = await createSupabaseServerClient();

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, slug, description, logo_url, primary_color")
    .eq("slug", restaurantSlug)
    .maybeSingle();

  if (restaurantError) {
    console.error("[PUBLIC MENU] restaurant error", restaurantError);
  }

  if (!restaurant) {
    notFound();
  }

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select(
      "id, name, slug, address, phone, whatsapp_number, is_active"
    )
    .eq("restaurant_id", restaurant.id)
    .eq("slug", branchSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (branchError) {
    console.error("[PUBLIC MENU] branch error", branchError);
  }

  if (!branch) {
    notFound();
  }

  const [{ data: categoriesData, error: categoriesError }, { data: itemsData, error: itemsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name_en, description_en, display_order")
        .eq("restaurant_id", restaurant.id)
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("items")
        .select(
          "id, category_id, name_en, description_en, price, secondary_price, primary_currency, secondary_currency, image_url, is_new, is_popular, is_spicy, is_vegetarian, is_vegan, is_gluten_free, display_order"
        )
        .eq("restaurant_id", restaurant.id)
        .eq("is_visible", true)
        .eq("is_available", true)
        .order("display_order", { ascending: true }),
    ]);

  if (categoriesError) {
    console.error("[PUBLIC MENU] categories error", categoriesError);
  }

  if (itemsError) {
    console.error("[PUBLIC MENU] items error", itemsError);
  }

  const itemsByCategory = new Map<string, ItemRecord[]>();
  (itemsData ?? []).forEach((item) => {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  });

  const categories = (categoriesData ?? [])
    .map((category) => ({
      ...category,
      items: (itemsByCategory.get(category.id) ?? []).sort(
        (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
      ),
    }))
    .filter((category) => category.items.length > 0);

  const accentColor = restaurant.primary_color?.trim() || "#0f172a";

  return (
    <MenuClient
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        description: restaurant.description,
        logo_url: restaurant.logo_url,
        primary_color: restaurant.primary_color,
      }}
      branch={{
        id: branch.id,
        name: branch.name,
        address: branch.address,
      }}
      categories={categories}
      accentColor={accentColor}
    />
  );
}
