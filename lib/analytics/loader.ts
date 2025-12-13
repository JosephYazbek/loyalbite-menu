import { createSupabaseServerClient } from "@/lib/supabaseServer";

export type AnalyticsRange = "7d" | "30d" | "90d" | "all";

export type AnalyticsResult = {
  kpis: Record<string, number>;
  viewsSeries: Array<{ date: string; count: number }>;
  favoritesSeries: Array<{ date: string; count: number }>;
  topSearchTerms: Array<{ term: string; count: number }>;
  searchZeroResults: Array<{ term: string; count: number }>;
  searchConversion: {
    totalSearches: number;
    zeroResults: number;
    zeroRate: number;
    favoriteRate: number;
    viewRate: number;
  };
  categories: Array<{
    id: string;
    name: string;
    views: number;
    modalOpens: number;
    favorites: number;
    engagement: number;
  }>;
  topItems: Array<{
    id: string;
    name: string;
    category: string;
    views: number;
    modalOpens: number;
    favorites: number;
    featuredViews: number;
    popularity: number;
  }>;
  favoritesLeaderboard: Array<{ id: string; name: string; category: string; count: number }>;
  featured: Array<{
    id: string;
    name: string;
    views: number;
    opens: number;
    favorites: number;
    engagement: number;
  }>;
  allergens: Array<{ allergen: string; count: number; percent: number }>;
  allergenHeatmap: Array<{ category: string; allergen: string; count: number }>;
  modifiers: Array<{ id: string; name: string; opens: number; selects: number; removes: number }>;
  modifierItems: Array<{ id: string; name: string; opens: number; selects: number; removes: number }>;
  funnels: {
    funnelA: Array<{ label: string; value: number }>;
    funnelB: Array<{ label: string; value: number }>;
  };
  devices: Array<{ label: string; value: number }>;
  deviceTrends?: Array<{ label: string; value: number }>;
  languages: Array<{ label: string; value: number }>;
  languageTrends?: Array<{ label: string; value: number }>;
};

const getRangeStart = (range: AnalyticsRange) => {
  if (range === "all") return null;
  const days = range === "7d" ? 6 : range === "30d" ? 29 : 89;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - days);
  return base.toISOString();
};

const getWindowDays = (range: AnalyticsRange) => {
  switch (range) {
    case "7d":
      return 7;
    case "30d":
      return 30;
    case "90d":
      return 90;
    default:
      return 0;
  }
};

const getPreviousRangeBounds = (range: AnalyticsRange, sinceIso: string | null) => {
  if (range === "all" || !sinceIso) return null;
  const windowDays = getWindowDays(range);
  if (!windowDays) return null;
  const sinceDate = new Date(sinceIso);
  const prevEnd = new Date(sinceDate.getTime() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (windowDays - 1));
  return { start: prevStart.toISOString(), end: prevEnd.toISOString() };
};

const buildSeries = (events: Array<{ created_at: string }>, range: AnalyticsRange) => {
  const map = new Map<string, number>();
  events.forEach((e) => {
    const key = new Date(e.created_at).toISOString().slice(0, 10);
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  if (range === "all") {
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([date, count]) => ({ date, count }));
  }
  const windowDays = getWindowDays(range);
  if (!windowDays) {
    return Array.from(map.entries())
    .sort(([a], [b]) => (a > b ? 1 : -1))
    .map(([date, count]) => ({ date, count }));
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (windowDays - 1));

  const series: Array<{ date: string; count: number }> = [];
  for (let dt = new Date(start); dt <= today; dt.setDate(dt.getDate() + 1)) {
    const key = dt.toISOString().slice(0, 10);
    series.push({ date: key, count: map.get(key) ?? 0 });
  }
  return series;
};

const normalizeSearchValue = (value: string | null | undefined) =>
  (value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export async function loadAnalytics({
  restaurantId,
  range,
}: {
  restaurantId: string;
  range: AnalyticsRange;
}): Promise<AnalyticsResult> {
  const supabase = await createSupabaseServerClient();
  const since = getRangeStart(range);
  const previousRange = getPreviousRangeBounds(range, since);

  const filters = (query: any) => {
    query = query.eq("restaurant_id", restaurantId);
    if (since) query = query.gte("created_at", since);
    return query;
  };

  const [eventsResp, categoriesResp, itemsResp, modifiersResp, previousDevicesResp, previousLanguagesResp] =
    await Promise.all([
      filters(
        supabase
          .from("analytics_events")
          .select(
            "event_type, category_id, item_id, device_type, language, metadata, created_at, session_id"
          )
      ),
      supabase.from("categories").select("id, name_en").eq("restaurant_id", restaurantId),
      supabase
        .from("items")
      .select(
        "id, name_en, name_ar, description_en, description_ar, category_id, is_featured, contains_dairy, contains_nuts, contains_eggs, contains_shellfish, contains_soy, contains_sesame"
      )
      .eq("restaurant_id", restaurantId),
      supabase.from("modifiers").select("id, name").eq("restaurant_id", restaurantId),
      previousRange
        ? supabase
            .from("analytics_events")
            .select("device_type")
            .eq("restaurant_id", restaurantId)
            .eq("event_type", "menu_view")
            .gte("created_at", previousRange.start)
            .lt("created_at", previousRange.end)
        : Promise.resolve({ data: [] }),
      previousRange
        ? supabase
            .from("analytics_events")
            .select("language")
            .eq("restaurant_id", restaurantId)
            .eq("event_type", "menu_view")
            .gte("created_at", previousRange.start)
            .lt("created_at", previousRange.end)
        : Promise.resolve({ data: [] }),
    ]);

  const events = eventsResp.data ?? [];
  const categories = categoriesResp.data ?? [];
  const items = itemsResp.data ?? [];
  const modifierGroups = modifiersResp.data ?? [];
  const previousDeviceEvents =
    (previousDevicesResp?.data as Array<{ device_type: string | null }> | undefined) ?? [];
  const previousLanguageEvents =
    (previousLanguagesResp?.data as Array<{ language: string | null }> | undefined) ?? [];

  const categoryName = new Map<string, string>();
  categories.forEach((c) => categoryName.set(c.id, c.name_en ?? "Uncategorized"));

  const itemMeta = new Map<
    string,
    {
      name: string;
      categoryId: string | null;
      isFeatured: boolean;
      searchFields: string[];
    }
  >();
  items.forEach((it) => {
    const categoryLabel = it.category_id ? categoryName.get(it.category_id) ?? "Uncategorized" : "";
    itemMeta.set(it.id, {
      name: it.name_en ?? "Unknown",
      categoryId: it.category_id,
      isFeatured: Boolean(it.is_featured),
      searchFields: [
        normalizeSearchValue(it.name_en),
        normalizeSearchValue(it.name_ar),
        normalizeSearchValue(it.description_en),
        normalizeSearchValue(it.description_ar),
        normalizeSearchValue(categoryLabel),
      ].filter((value) => value.length > 0),
    });
  });

  const kpi = {
    menu_views: 0,
    unique_sessions: 0,
    category_views: 0,
    item_views: 0,
    item_modal_opens: 0,
    favorites: 0,
    filters: 0,
    searches: 0,
    snapshots: 0,
  };

  const sessionSet = new Set<string>();
  const searchTermMap = new Map<string, number>();
  const categoryPerf = new Map<string, { views: number; modalOpens: number; favorites: number }>();
  const itemPerf = new Map<
    string,
    { views: number; modalOpens: number; favorites: number; featuredViews: number }
  >();
  const favoritesLeaderboard = new Map<string, number>();
  const featuredPerf = new Map<string, { views: number; opens: number; favorites: number }>();
  const allergenCounts: Record<string, number> = {
    dairy: 0,
    nuts: 0,
    eggs: 0,
    shellfish: 0,
    soy: 0,
    sesame: 0,
  };
  const modifierCounts = new Map<string, { opens: number; selects: number; removes: number }>();
  const modifierItemCounts = new Map<string, { opens: number; selects: number; removes: number }>();

  const menuViews = events.filter((e) => e.event_type === "menu_view");

  events.forEach((e) => {
    if (e.session_id) sessionSet.add(e.session_id);
    switch (e.event_type) {
      case "menu_view":
        kpi.menu_views += 1;
        break;
      case "category_view":
        kpi.category_views += 1;
        break;
      case "item_view":
        kpi.item_views += 1;
        if (e.item_id && itemMeta.get(e.item_id)?.isFeatured) {
          const current = featuredPerf.get(e.item_id) ?? { views: 0, opens: 0, favorites: 0 };
          current.views += 1;
          featuredPerf.set(e.item_id, current);
        }
        break;
      case "item_modal_open":
        kpi.item_modal_opens += 1;
        if (e.item_id && itemMeta.get(e.item_id)?.isFeatured) {
          const current = featuredPerf.get(e.item_id) ?? { views: 0, opens: 0, favorites: 0 };
          current.opens += 1;
          featuredPerf.set(e.item_id, current);
        }
        break;
      case "menu_favorite":
        kpi.favorites += 1;
        if (e.item_id) {
          favoritesLeaderboard.set(e.item_id, (favoritesLeaderboard.get(e.item_id) ?? 0) + 1);
          const currentItem = itemPerf.get(e.item_id) ?? {
            views: 0,
            modalOpens: 0,
            favorites: 0,
            featuredViews: 0,
          };
          currentItem.favorites += 1;
          itemPerf.set(e.item_id, currentItem);
          if (itemMeta.get(e.item_id)?.isFeatured) {
            const current = featuredPerf.get(e.item_id) ?? { views: 0, opens: 0, favorites: 0 };
            current.favorites += 1;
            featuredPerf.set(e.item_id, current);
          }
        }
        break;
      case "menu_filter":
        kpi.filters += 1;
        break;
      case "menu_search": {
        kpi.searches += 1;
        const term = (e.metadata?.search_term as string | undefined)?.trim()?.toLowerCase();
        if (term) {
          searchTermMap.set(term, (searchTermMap.get(term) ?? 0) + 1);
        }
        break;
      }
      case "menu_cached_load":
        kpi.snapshots += 1;
        break;
      case "allergen_filter_apply": {
        const meta = e.metadata ?? {};
        (["dairy", "nuts", "eggs", "shellfish", "soy", "sesame"] as const).forEach((key) => {
          if (meta[key]) allergenCounts[key] += 1;
        });
        break;
      }
      case "modifier_group_open": {
        const id = (e.metadata?.modifierId as string) ?? "group";
        const current = modifierCounts.get(id) ?? { opens: 0, selects: 0, removes: 0 };
        current.opens += 1;
        modifierCounts.set(id, current);

        if (e.item_id) {
          const perItem = modifierItemCounts.get(e.item_id) ?? { opens: 0, selects: 0, removes: 0 };
          perItem.opens += 1;
          modifierItemCounts.set(e.item_id, perItem);
        }
        break;
      }
      case "modifier_option_select": {
        const id = (e.metadata?.modifierId as string) ?? "group";
        const current = modifierCounts.get(id) ?? { opens: 0, selects: 0, removes: 0 };
        current.selects += 1;
        modifierCounts.set(id, current);
        if (e.item_id) {
          const perItem = modifierItemCounts.get(e.item_id) ?? { opens: 0, selects: 0, removes: 0 };
          perItem.selects += 1;
          modifierItemCounts.set(e.item_id, perItem);
        }
        break;
      }
      case "modifier_option_remove": {
        const id = (e.metadata?.modifierId as string) ?? "group";
        const current = modifierCounts.get(id) ?? { opens: 0, selects: 0, removes: 0 };
        current.removes += 1;
        modifierCounts.set(id, current);
        if (e.item_id) {
          const perItem = modifierItemCounts.get(e.item_id) ?? { opens: 0, selects: 0, removes: 0 };
          perItem.removes += 1;
          modifierItemCounts.set(e.item_id, perItem);
        }
        break;
      }
    }

    if (e.category_id) {
      const cat = categoryPerf.get(e.category_id) ?? { views: 0, modalOpens: 0, favorites: 0 };
      if (e.event_type === "item_view") cat.views += 1;
      if (e.event_type === "item_modal_open") cat.modalOpens += 1;
      if (e.event_type === "menu_favorite") cat.favorites += 1;
      categoryPerf.set(e.category_id, cat);
    }

    if (e.item_id) {
      const item = itemPerf.get(e.item_id) ?? {
        views: 0,
        modalOpens: 0,
        favorites: 0,
        featuredViews: 0,
      };
      if (e.event_type === "item_view") item.views += 1;
      if (e.event_type === "item_modal_open") item.modalOpens += 1;
      if (e.event_type === "menu_favorite") item.favorites += 1;
      if (e.event_type === "item_featured_view") item.featuredViews += 1;
      itemPerf.set(e.item_id, item);
    }
  });

  const favoritesSeries = buildSeries(events.filter((e) => e.event_type === "menu_favorite"), range);

  const topSearchTerms = Array.from(searchTermMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([term, count]) => ({ term, count }));

  const zeroResultTerms = Array.from(searchTermMap.entries())
    .reduce<Array<{ term: string; count: number }>>((acc, [term, count]) => {
      const normalizedTerm = normalizeSearchValue(term);
      if (!normalizedTerm) return acc;
      const hasMatch = Array.from(itemMeta.values()).some((meta) =>
        meta.searchFields.some((field) => field.includes(normalizedTerm))
      );
      if (!hasMatch) acc.push({ term, count });
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  const zeroResultsTotal = zeroResultTerms.reduce((sum, entry) => sum + entry.count, 0);
  const searchConversion = {
    totalSearches: kpi.searches,
    zeroResults: zeroResultsTotal,
    zeroRate: kpi.searches > 0 ? Math.round((zeroResultsTotal / kpi.searches) * 100) : 0,
    favoriteRate: kpi.searches > 0 ? Math.round((kpi.favorites / kpi.searches) * 100) : 0,
    viewRate: kpi.searches > 0 ? Math.round((kpi.item_views / kpi.searches) * 100) : 0,
  };

  const categoriesResult = Array.from(categoryPerf.entries())
    .map(([categoryId, stats]) => ({
      id: categoryId,
      name: categoryName.get(categoryId) ?? "Uncategorized",
      views: stats.views,
      modalOpens: stats.modalOpens,
      favorites: stats.favorites,
      engagement: stats.views ? Math.round((stats.modalOpens / stats.views) * 100) : 0,
    }))
    .sort((a, b) => b.views - a.views);

  const topItems = Array.from(itemPerf.entries())
    .map(([id, stats]) => {
      const meta = itemMeta.get(id);
      const popularity = stats.views + stats.modalOpens * 3 + stats.favorites * 5;
      return {
        id,
        name: meta?.name ?? "Unknown",
        category: meta?.categoryId ? categoryName.get(meta.categoryId) ?? "Uncategorized" : "Uncategorized",
        views: stats.views,
        modalOpens: stats.modalOpens,
        favorites: stats.favorites,
        featuredViews: stats.featuredViews,
        popularity,
      };
    })
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, 15);

  const favoritesLeaderboardArr = Array.from(favoritesLeaderboard.entries())
    .map(([id, count]) => ({
      id,
      name: itemMeta.get(id)?.name ?? "Unknown",
      category: itemMeta.get(id)?.categoryId
        ? categoryName.get(itemMeta.get(id)!.categoryId!) ?? "Uncategorized"
        : "Uncategorized",
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const featured = Array.from(featuredPerf.entries())
    .map(([id, stats]) => ({
      id,
      name: itemMeta.get(id)?.name ?? "Unknown",
      views: stats.views,
      opens: stats.opens,
      favorites: stats.favorites,
      engagement: stats.views ? Math.round((stats.opens / stats.views) * 100) : 0,
    }))
    .sort((a, b) => b.views - a.views);

  const allergenKeys = ["dairy", "nuts", "eggs", "shellfish", "soy", "sesame"] as const;

  const allergens = Object.entries(allergenCounts)
    .map(([allergen, count]) => ({
      allergen,
      count,
      percent: kpi.menu_views > 0 ? Math.round((count / kpi.menu_views) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const allergenHeatmap: Array<{ category: string; allergen: string; count: number }> = [];
  categories.forEach((cat) => {
    const catItems = items.filter((item) => item.category_id === cat.id);
    allergenKeys.forEach((key) => {
      const field = `contains_${key}` as const;
      const count = catItems.filter((item) => Boolean((item as any)[field])).length;
      allergenHeatmap.push({
        category: categoryName.get(cat.id) ?? "Uncategorized",
        allergen: key,
        count,
      });
    });
  });

  const modifierNameMap = new Map<string, string>();
  modifierGroups.forEach((group) => modifierNameMap.set(group.id, group.name));

  const modifiers = Array.from(modifierCounts.entries())
    .map(([id, counts]) => ({
      id,
      name: modifierNameMap.get(id) ?? "Modifier group",
      ...counts,
    }))
    .sort((a, b) => b.opens - a.opens);

  const modifierItems = Array.from(modifierItemCounts.entries())
    .map(([itemId, counts]) => ({
      id: itemId,
      name: itemMeta.get(itemId)?.name ?? "Menu item",
      ...counts,
    }))
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 15);

  const funnelA = [
    { label: "Menu views", value: kpi.menu_views },
    { label: "Category clicks", value: kpi.category_views },
    { label: "Item views", value: kpi.item_views },
    { label: "Modal opens", value: kpi.item_modal_opens },
    { label: "Favorites", value: kpi.favorites },
  ];

  const funnelB = [
    { label: "Menu views", value: kpi.menu_views },
    { label: "Filters applied", value: kpi.filters },
    { label: "Item views", value: kpi.item_views },
  ];

  const deviceCounts = { mobile: 0, desktop: 0, tablet: 0 };
  menuViews.forEach((e) => {
    if (e.device_type === "mobile") deviceCounts.mobile += 1;
    else if (e.device_type === "desktop") deviceCounts.desktop += 1;
    else deviceCounts.tablet += 1;
  });

  const languageCounts = new Map<string, number>();
  menuViews.forEach((e) => {
    const key = e.language ?? "unknown";
    languageCounts.set(key, (languageCounts.get(key) ?? 0) + 1);
  });

  return {
    kpis: {
      ...kpi,
      unique_sessions: sessionSet.size || kpi.menu_views,
    },
    viewsSeries: buildSeries(menuViews, range),
    favoritesSeries,
    topSearchTerms,
    categories: categoriesResult,
    topItems,
    favoritesLeaderboard: favoritesLeaderboardArr,
    featured,
    allergens,
    allergenHeatmap,
    modifiers,
    modifierItems,
    funnels: { funnelA, funnelB },
    devices: [
      { label: "Mobile", value: deviceCounts.mobile },
      { label: "Desktop", value: deviceCounts.desktop },
      { label: "Tablet/Other", value: deviceCounts.tablet },
    ],
    deviceTrends: previousDeviceEvents.length
      ? Object.entries(
          previousDeviceEvents.reduce<Record<string, number>>((acc, row) => {
            const label =
              row.device_type === "mobile"
                ? "Mobile"
                : row.device_type === "desktop"
                  ? "Desktop"
                  : "Tablet/Other";
            acc[label] = (acc[label] ?? 0) + 1;
            return acc;
          }, {})
        ).map(([label, value]) => ({ label, value }))
      : undefined,
    languages: Array.from(languageCounts.entries()).map(([label, value]) => ({ label, value })),
    languageTrends: previousLanguageEvents.length
      ? Object.entries(
          previousLanguageEvents.reduce<Record<string, number>>((acc, row) => {
            const label = row.language ?? "unknown";
            acc[label] = (acc[label] ?? 0) + 1;
            return acc;
          }, {})
        ).map(([label, value]) => ({ label, value }))
      : undefined,
    searchZeroResults: zeroResultTerms,
    searchConversion,
  };
}
