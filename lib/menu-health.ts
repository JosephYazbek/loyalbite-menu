import { SupabaseClient } from "@supabase/supabase-js";

const TAG_FIELDS: Array<
  | "is_new"
  | "is_popular"
  | "is_spicy"
  | "is_vegetarian"
  | "is_vegan"
  | "is_gluten_free"
> = [
  "is_new",
  "is_popular",
  "is_spicy",
  "is_vegetarian",
  "is_vegan",
  "is_gluten_free",
];

export type MenuHealthIssue = {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  affectedCount?: number;
  hint?: string;
};

export type MenuHealthScore = {
  score: number;
  breakdown: {
    photos: number;
    descriptions: number;
    translations: number;
    tags: number;
    structure: number;
    performance: number;
  };
  metrics: {
    totalItems: number;
    itemsWithImage: number;
    itemsWithDescriptionEn: number;
    itemsWithDescriptionAr: number;
    itemsWithAnyTag: number;
    itemsWithNoTag: number;
    categories: Array<{
      id: string;
      name_en: string | null;
      itemCount: number;
    }>;
  };
  issues: MenuHealthIssue[];
};

type RawItem = {
  id: string;
  category_id: string | null;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  image_url: string | null;
  is_visible: boolean | null;
} & Record<
  (typeof TAG_FIELDS)[number],
  boolean | null
>;

type RawCategory = {
  id: string;
  name_en: string | null;
};

const isRawItem = (value: unknown): value is RawItem =>
  Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "category_id" in value &&
      "name_en" in value &&
      "name_ar" in value &&
      "description_en" in value &&
      "description_ar" in value &&
      "image_url" in value &&
      "is_visible" in value
  );

const isRawCategory = (value: unknown): value is RawCategory =>
  Boolean(
    value &&
      typeof value === "object" &&
      "id" in value &&
      "name_en" in value
  );

const clampScore = (value: number) => Math.min(100, Math.max(0, Math.round(value)));

export async function calculateMenuHealth(
  supabase: SupabaseClient,
  restaurantId: string
): Promise<MenuHealthScore> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const [{ data: itemsData }, { data: categoriesData }, { data: itemEvents }] = await Promise.all([
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
          "image_url",
          "is_visible",
          ...TAG_FIELDS,
        ].join(", ")
      )
      .eq("restaurant_id", restaurantId),
    supabase.from("categories").select("id, name_en").eq("restaurant_id", restaurantId),
    supabase
      .from("analytics_events")
      .select("item_id")
      .eq("restaurant_id", restaurantId)
      .eq("event_type", "item_view")
      .gte("created_at", thirtyDaysAgo.toISOString()),
  ]);

  const items: RawItem[] = Array.isArray(itemsData)
    ? (itemsData as unknown[]).filter(isRawItem)
    : [];
  const categories: RawCategory[] = Array.isArray(categoriesData)
    ? (categoriesData as unknown[]).filter(isRawCategory)
    : [];

  const totalItems = items.length;
  const itemsWithImage = items.filter((item) => Boolean(item.image_url)).length;
  const itemsWithDescriptionEn = items.filter((item) => Boolean(item.description_en?.trim()))
    .length;
  const itemsWithDescriptionAr = items.filter(
    (item) => Boolean(item.name_ar?.trim() && item.description_ar?.trim())
  ).length;

  const itemsWithAnyTag = items.filter((item) =>
    TAG_FIELDS.some((tag) => Boolean(item[tag]))
  ).length;
  const itemsWithNoTag = totalItems - itemsWithAnyTag;

  const categoryCounts = new Map<string, number>();
  categories.forEach((category) => categoryCounts.set(category.id, 0));
  items.forEach((item) => {
    if (!item.category_id) return;
    categoryCounts.set(item.category_id, (categoryCounts.get(item.category_id) ?? 0) + 1);
  });

  const metricsCategories = categories.map((category) => ({
    id: category.id,
    name_en: category.name_en,
    itemCount: categoryCounts.get(category.id) ?? 0,
  }));

  const photosScore = totalItems ? (itemsWithImage / totalItems) * 100 : 0;
  const descriptionsScore = totalItems ? (itemsWithDescriptionEn / totalItems) * 100 : 100;
  const translationsScore = totalItems ? (itemsWithDescriptionAr / totalItems) * 100 : 100;
  const tagsScore = totalItems ? (itemsWithAnyTag / totalItems) * 100 : 50;

  const overloadedCategories = metricsCategories.filter((category) => category.itemCount > 20);
  let structureScore = 100;
  if (metricsCategories.length <= 1) {
    structureScore -= 40;
  }
  structureScore -= Math.min(40, overloadedCategories.length * 10);
  structureScore = Math.max(0, structureScore);

  const visibleItems = items.filter((item) => item.is_visible !== false);
  const visibleItemIds = new Set(visibleItems.map((item) => item.id));
  const viewMap = new Map<string, number>();
  (itemEvents ?? []).forEach((event) => {
    if (!event.item_id) return;
    viewMap.set(event.item_id, (viewMap.get(event.item_id) ?? 0) + 1);
  });
  const zeroViewVisibleItems = Array.from(visibleItemIds).filter(
    (itemId) => (viewMap.get(itemId) ?? 0) === 0
  );
  const performanceScore = visibleItems.length
    ? 100 - (zeroViewVisibleItems.length / visibleItems.length) * 100
    : 100;

  const breakdown = {
    photos: clampScore(photosScore),
    descriptions: clampScore(descriptionsScore),
    translations: clampScore(translationsScore),
    tags: clampScore(tagsScore),
    structure: clampScore(structureScore),
    performance: clampScore(performanceScore),
  };

  const score = clampScore(
    breakdown.photos * 0.25 +
      breakdown.descriptions * 0.2 +
      breakdown.translations * 0.15 +
      breakdown.tags * 0.1 +
      breakdown.structure * 0.15 +
      breakdown.performance * 0.15
  );

  const issues: MenuHealthIssue[] = [];
  if (totalItems - itemsWithImage > 0) {
    issues.push({
      id: "missing_images",
      severity: "high",
      title: "Items missing photos",
      description: `${totalItems - itemsWithImage} items don’t have images. Menus with photos convert better.`,
      affectedCount: totalItems - itemsWithImage,
      hint: "Add appetizing photos for your top-selling items first.",
    });
  }
  if (totalItems - itemsWithDescriptionEn > 0) {
    issues.push({
      id: "missing_descriptions",
      severity: "medium",
      title: "Add short descriptions",
      description: `${totalItems - itemsWithDescriptionEn} items have no description.`,
      affectedCount: totalItems - itemsWithDescriptionEn,
      hint: "A single sentence can help customers decide faster.",
    });
  }
  if (totalItems - itemsWithDescriptionAr > 0) {
    issues.push({
      id: "missing_translations",
      severity: "medium",
      title: "Arabic translations missing",
      description: `${totalItems - itemsWithDescriptionAr} items are missing Arabic name or description.`,
      affectedCount: totalItems - itemsWithDescriptionAr,
      hint: "Translate your best sellers to reach Arabic-speaking guests.",
    });
  }
  if (itemsWithNoTag > 0) {
    issues.push({
      id: "missing_tags",
      severity: "low",
      title: "Highlight special traits",
      description: `${itemsWithNoTag} items don’t have any tags (New, Popular, Vegan, etc.).`,
      affectedCount: itemsWithNoTag,
      hint: "Use tags to highlight features or dietary options.",
    });
  }
  if (overloadedCategories.length > 0 || metricsCategories.length <= 1) {
    const overloadedList = overloadedCategories
      .map((cat) => `${cat.name_en ?? "Category"} (${cat.itemCount})`)
      .join(", ");
    issues.push({
      id: "overloaded_categories",
      severity: overloadedCategories.length > 1 ? "high" : "medium",
      title: "Some categories look overcrowded",
      description:
        metricsCategories.length <= 1
          ? "There is only one visible category; consider splitting items into clearer sections."
          : `Consider splitting these categories: ${overloadedList}.`,
      affectedCount: overloadedCategories.length || metricsCategories.length,
      hint: "Break up long lists into smaller groups or spotlight best-sellers.",
    });
  }
  if (zeroViewVisibleItems.length > 0) {
    issues.push({
      id: "low_engagement_items",
      severity: "low",
      title: "Items with no recent views",
      description: `${zeroViewVisibleItems.length} visible items had 0 views in the last 30 days.`,
      affectedCount: zeroViewVisibleItems.length,
      hint: "Review pricing, naming, or consider promoting/removing these dishes.",
    });
  }

  return {
    score,
    breakdown,
    metrics: {
      totalItems,
      itemsWithImage,
      itemsWithDescriptionEn,
      itemsWithDescriptionAr,
      itemsWithAnyTag,
      itemsWithNoTag,
      categories: metricsCategories,
    },
    issues,
  };
}
