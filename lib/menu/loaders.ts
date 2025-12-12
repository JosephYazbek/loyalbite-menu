import { parseRestaurantProfileMeta } from "@/lib/restaurant-profile";
import type { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  DbCategoryRow,
  DbItemRow,
  ItemBranchOverrideRow,
  MenuCategory,
  MenuItem,
  MenuSnapshotPayload,
  ModifierGroup,
  ModifierOption,
  PublicBranchMeta,
  PublicMenuPayload,
  PublicRestaurantMeta,
} from "./types";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

const normalizeNumber = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const buildSecondaryPrice = (
  overrideSecondary: number | string | null | undefined,
  baseSecondary: number | string | null | undefined,
  effectivePrice: number | string | null | undefined,
  conversionRate: number | null | undefined
): number | string | null => {
  if (overrideSecondary !== null && overrideSecondary !== undefined) return overrideSecondary;
  if (baseSecondary !== null && baseSecondary !== undefined && baseSecondary !== "") {
    return baseSecondary;
  }
  if (!conversionRate) return null;
  const numeric = normalizeNumber(effectivePrice);
  if (numeric === null) return null;
  return Number((numeric * conversionRate).toFixed(0));
};

const buildItemWithOverrides = (
  item: DbItemRow,
  override: ItemBranchOverrideRow | undefined,
  conversionRate: number | null | undefined,
  modifiers: ModifierGroup[] | undefined,
  favorites: Set<string> | undefined
): MenuItem => {
  const effectivePrice = override?.price ?? item.price;
  const effectiveAvailability = override?.is_available ?? (item.is_available ?? true);
  const secondaryPrice = buildSecondaryPrice(
    override?.secondary_price ?? null,
    item.secondary_price ?? null,
    effectivePrice,
    conversionRate
  );

  return {
    ...item,
    price: effectivePrice,
    secondary_price: secondaryPrice,
    display_order: override?.display_order ?? item.display_order,
    is_available: effectiveAvailability,
    modifiers,
    favorite: favorites ? favorites.has(item.id) : false,
  };
};

export const sortByDisplayOrder = <T extends { display_order: number | null | undefined; id: string }>(
  list: T[]
) => [...list].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || a.id.localeCompare(b.id));

export async function fetchModifierGroups(
  supabase: SupabaseServerClient,
  restaurantId: string
): Promise<ModifierGroup[]> {
  const { data, error } = await supabase
    .from("modifiers")
    .select("id, restaurant_id, name, min_choices, max_choices, modifier_options(id, name, price)")
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[MENU] modifiers fetch error", error);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id,
    restaurant_id: row.restaurant_id,
    name: row.name,
    min_choices: normalizeNumber(row.min_choices) ?? 0,
    max_choices: normalizeNumber(row.max_choices) ?? 1,
    options:
      (row.modifier_options ?? []).map(
        (opt: ModifierOption) =>
          ({
            id: opt.id,
            name: opt.name,
            price: normalizeNumber(opt.price),
          } as ModifierOption)
      ) ?? [],
  }));
}

export async function fetchItemModifierAssignments(
  supabase: SupabaseServerClient,
  itemIds: string[]
): Promise<Record<string, string[]>> {
  if (!itemIds.length) return {};
  const { data, error } = await supabase
    .from("item_modifiers")
    .select("item_id, modifier_id")
    .in("item_id", itemIds);

  if (error) {
    console.error("[MENU] item_modifiers fetch error", error);
    return {};
  }

  return (data ?? []).reduce<Record<string, string[]>>((acc, row) => {
    if (!row.item_id || !row.modifier_id) return acc;
    acc[row.item_id] = acc[row.item_id] ? [...acc[row.item_id], row.modifier_id] : [row.modifier_id];
    return acc;
  }, {});
}

export const mapItemModifiers = (
  assignments: Record<string, string[]>,
  modifierGroups: ModifierGroup[]
): Record<string, ModifierGroup[]> => {
  const modifierById = new Map<string, ModifierGroup>();
  modifierGroups.forEach((group) => modifierById.set(group.id, group));

  return Object.entries(assignments).reduce<Record<string, ModifierGroup[]>>((acc, [itemId, modifierIds]) => {
    acc[itemId] = modifierIds
      .map((id) => modifierById.get(id))
      .filter((group): group is ModifierGroup => Boolean(group));
    return acc;
  }, {});
};

export async function fetchFavoriteItemIds(
  supabase: SupabaseServerClient,
  sessionId: string | null | undefined,
  itemIds: string[]
): Promise<Set<string>> {
  if (!sessionId || !itemIds.length) return new Set<string>();
  const { data, error } = await supabase
    .from("customer_favorites")
    .select("item_id")
    .eq("session_id", sessionId)
    .in("item_id", itemIds);

  if (error) {
    console.error("[MENU] favorites fetch error", error);
    return new Set<string>();
  }

  return new Set((data ?? []).map((row) => row.item_id).filter(Boolean) as string[]);
}

export const buildMenuCategories = ({
  categories,
  items,
  overrides,
  conversionRate,
  itemModifiersMap,
  favorites,
}: {
  categories: DbCategoryRow[];
  items: DbItemRow[];
  overrides: ItemBranchOverrideRow[];
  conversionRate: number | null | undefined;
  itemModifiersMap: Record<string, ModifierGroup[]>;
  favorites?: Set<string>;
}): MenuCategory[] => {
  const overridesMap = new Map<string, ItemBranchOverrideRow>();
  overrides.forEach((override) => overridesMap.set(override.item_id, override));

  const itemsByCategory = new Map<string, DbItemRow[]>();
  items.forEach((item) => {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  });

  return categories
    .map((category) => {
      const categoryItems = itemsByCategory.get(category.id) ?? [];
      const mapped = categoryItems.map((item) =>
        buildItemWithOverrides(
          item,
          overridesMap.get(item.id),
          conversionRate,
          itemModifiersMap[item.id],
          favorites
        )
      );
      return {
        ...category,
        items: sortByDisplayOrder(mapped),
      };
    })
    .map((category) => ({
      ...category,
      display_order: category.display_order ?? 0,
    }))
    .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0));
};

export async function fetchMenuSnapshot(
  supabase: SupabaseServerClient,
  restaurantId: string,
  branchId: string
): Promise<MenuSnapshotPayload | null> {
  const { data, error } = await supabase
    .from("menu_snapshots")
    .select("id, json_data, created_at")
    .eq("restaurant_id", restaurantId)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[MENU] snapshot fetch error", error);
    return null;
  }

  if (!data?.json_data) return null;

  return {
    id: data.id,
    created_at: data.created_at,
    ...(data.json_data as MenuSnapshotPayload),
  };
}

export const buildPublicMeta = (restaurant: any): PublicRestaurantMeta => ({
  id: restaurant.id,
  name: restaurant.name,
  description_en: restaurant.description_en,
  description_ar: restaurant.description_ar,
  logo_url: restaurant.logo_url,
  primary_color: restaurant.primary_color,
  default_language: restaurant.default_language,
  cover_image_url: restaurant.cover_image_url ?? restaurant.cover_url ?? null,
  phone: restaurant.phone,
  whatsappPhone: restaurant.whatsapp_phone ?? restaurant.whatsapp_number,
  website: restaurant.website,
});

export const buildBranchMeta = (branch: any): PublicBranchMeta => ({
  id: branch.id,
  name: branch.name,
  address: branch.address,
  phone: branch.phone,
  whatsappNumber: branch.whatsapp_number,
});

export async function loadPublicMenuData({
  supabase,
  restaurantSlug,
  branchSlug,
  sessionId,
}: {
  supabase: SupabaseServerClient;
  restaurantSlug: string;
  branchSlug: string;
  sessionId?: string | null;
}): Promise<PublicMenuPayload | null> {
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
        "cover_url",
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
  if (!restaurant) return null;

  const { data: branch, error: branchError } = await supabase
    .from("branches")
    .select("id, name, slug, address, phone, whatsapp_number, is_active")
    .eq("restaurant_id", restaurant.id)
    .eq("slug", branchSlug)
    .eq("is_active", true)
    .maybeSingle();

  if (branchError) {
    console.error("[PUBLIC MENU] branch error", branchError);
  }
  if (!branch) return null;

  const [
    { data: categoriesData, error: categoriesError },
    { data: itemsData, error: itemsError },
    { data: overridesData, error: overridesError },
  ] = await Promise.all([
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
          "is_available",
          "is_visible",
          "diet_category",
          "display_order",
          "contains_dairy",
          "contains_nuts",
          "contains_eggs",
          "contains_shellfish",
          "contains_soy",
          "contains_sesame",
          "is_featured",
          "recommendation_score",
        ].join(", ")
      )
      .eq("restaurant_id", restaurant.id)
      .eq("is_visible", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("item_branch_overrides")
      .select("item_id, price, secondary_price, is_available, display_order")
      .eq("restaurant_id", restaurant.id)
      .eq("branch_id", branch.id),
  ]);

  if (overridesError) console.error("[PUBLIC MENU] overrides error", overridesError);
  if (categoriesError) console.error("[PUBLIC MENU] categories error", categoriesError);
  if (itemsError) console.error("[PUBLIC MENU] items error", itemsError);

  const conversionRate = parseRestaurantProfileMeta(restaurant.description).conversionRate;

  let categories: MenuCategory[] = [];
  let fromSnapshot = false;
  let snapshotId: string | null = null;

  if (categoriesData && itemsData) {
    const itemIds = itemsData.map((item) => item.id);
    const [modifierGroups, assignments, favoriteIds] = await Promise.all([
      fetchModifierGroups(supabase, restaurant.id),
      fetchItemModifierAssignments(supabase, itemIds),
      fetchFavoriteItemIds(supabase, sessionId, itemIds),
    ]);
    const itemModifiersMap = mapItemModifiers(assignments, modifierGroups);

    categories = buildMenuCategories({
      categories: categoriesData as DbCategoryRow[],
      items: itemsData as DbItemRow[],
      overrides: (overridesData ?? []) as ItemBranchOverrideRow[],
      conversionRate,
      itemModifiersMap,
      favorites: favoriteIds,
    }).filter((category) => category.items.length > 0);
  }

  const shouldUseSnapshot =
    fromSnapshot ||
    !!categoriesError ||
    !!itemsError ||
    !!overridesError ||
    !categoriesData ||
    !itemsData ||
    categories.length === 0;

  if (shouldUseSnapshot) {
    const snapshot = await fetchMenuSnapshot(supabase, restaurant.id, branch.id);
    if (snapshot?.categories?.length) {
      categories = snapshot.categories;
      fromSnapshot = true;
      snapshotId = snapshot.id ?? null;
    }
  }

  const accentColor = restaurant.primary_color?.trim() || "#0f172a";

  return {
    restaurant: buildPublicMeta(restaurant),
    branch: buildBranchMeta(branch),
    categories,
    accentColor,
    fromSnapshot,
    snapshotId,
  };
}
