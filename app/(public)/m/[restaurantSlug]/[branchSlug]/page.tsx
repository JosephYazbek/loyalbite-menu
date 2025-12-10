import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { MenuClient } from "./menu-client";
import { determineInitialLanguage, resolveLanguageParam } from "@/lib/language";
import { parseRestaurantProfileMeta } from "@/lib/restaurant-profile";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    restaurantSlug: string;
    branchSlug: string;
  }>;
  searchParams: Promise<{
    lang?: string | string[];
  }>;
};

type CategoryRecord = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  display_order: number | null;
  is_visible: boolean | null;
  is_offers: boolean | null;
};

type ItemRecord = {
  id: string;
  category_id: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price: number | string | null;
  secondary_price: number | string | null;
  primary_currency: string | null;
  secondary_currency: string | null;
  image_url: string | null;
  calories: number | string | null;
  is_new: boolean | null;
  is_popular: boolean | null;
  is_spicy: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  display_order: number | null;
};

type OverrideRecord = {
  item_id: string;
  price: number | string | null;
  secondary_price: number | string | null;
  is_available: boolean | null;
  display_order: number | null;
};

export default async function BranchPublicMenuPage({
  params,
  searchParams,
}: PageProps) {
  const [{ restaurantSlug, branchSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  noStore();
  const supabase = await createSupabaseServerClient();

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select(
      [
        "id",
        "name",
        "slug",
        "description_en",
        "description_ar",
        "logo_url",
        "description",
        "primary_color",
        "default_language",
        "cover_image_url",
        "phone",
        "whatsapp_phone",
        "whatsapp_number",
        "website",
      ].join(", ")
    )
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
        .select("id, name_en, name_ar, description_en, description_ar, display_order, is_visible, is_offers")
        .eq("restaurant_id", restaurant.id)
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("items")
        .select(
          [
            "id",
            "category_id",
            "name_en",
            "name_ar",
            "description_en",
            "description_ar",
            "price",
            "secondary_price",
            "primary_currency",
            "secondary_currency",
            "calories",
            "image_url",
            "is_new",
            "is_popular",
            "is_spicy",
            "is_vegetarian",
            "is_vegan",
            "is_gluten_free",
            "display_order",
          ].join(", ")
        )
        .eq("restaurant_id", restaurant.id)
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
    ]);

  const { data: overridesData, error: overridesError } = await supabase
    .from("item_branch_overrides")
    .select("item_id, price, secondary_price, is_available, display_order")
    .eq("restaurant_id", restaurant.id)
    .eq("branch_id", branch.id);

  if (overridesError) {
    console.error("[PUBLIC MENU] overrides error", overridesError);
  }

  if (categoriesError) {
    console.error("[PUBLIC MENU] categories error", categoriesError);
  }

  if (itemsError) {
    console.error("[PUBLIC MENU] items error", itemsError);
  }

  const urlLanguage = resolveLanguageParam(query?.lang);
  const initialLanguage = determineInitialLanguage(
    restaurant.default_language,
    urlLanguage
  );

  const itemsByCategory = new Map<string, ItemRecord[]>();
  (itemsData ?? []).forEach((item) => {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  });

  const overridesMap = new Map<string, OverrideRecord>();
  (overridesData ?? []).forEach((override) => {
    overridesMap.set(override.item_id, override);
  });

  const profileMeta = parseRestaurantProfileMeta(restaurant.description);
  const conversionRate = profileMeta.conversionRate;
  const convertSecondary = (priceValue: number | string | null) => {
    if (!conversionRate) return null;
    const numeric =
      typeof priceValue === "number" ? priceValue : Number(priceValue);
    if (!Number.isFinite(numeric)) return null;
    return Number((numeric * conversionRate).toFixed(0));
  };

  const categories = (categoriesData ?? [])
    .map((category) => ({
      ...category,
      items: (itemsByCategory.get(category.id) ?? [])
        .map((item) => {
          const override = overridesMap.get(item.id);
          const effectiveAvailability = override?.is_available ?? item.is_available;
          if (effectiveAvailability === false) {
            return null;
          }

          const effectivePrice = override?.price ?? item.price;
          return {
            ...item,
            price: effectivePrice,
            secondary_price:
              override?.secondary_price ??
              item.secondary_price ??
              convertSecondary(effectivePrice),
            display_order: override?.display_order ?? item.display_order,
          };
        })
        .filter((item): item is ItemRecord => Boolean(item))
        .sort(
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
        description_en: restaurant.description_en,
        description_ar: restaurant.description_ar,
        logo_url: restaurant.logo_url,
        primary_color: restaurant.primary_color,
        default_language: restaurant.default_language,
        cover_image_url: restaurant.cover_image_url,
        phone: restaurant.phone,
        whatsapp_phone: restaurant.whatsapp_phone ?? restaurant.whatsapp_number,
        website: restaurant.website,
      }}
      branch={{
        id: branch.id,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        whatsappNumber: branch.whatsapp_number,
      }}
      categories={categories}
      accentColor={accentColor}
      initialLanguage={initialLanguage}
    />
  );
}
