import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { RangeSelector } from "./range-selector";
import { ViewsChart, DailyViewPoint } from "./views-chart";

type SearchParams = {
  range?: string;
};

type AnalyticsEvent = {
  branch_id: string | null;
  category_id: string | null;
  item_id: string | null;
  event_type: string;
  device_type: string | null;
  language: string | null;
  session_id: string | null;
  created_at: string;
};

type BranchPerformanceRow = {
  branchId: string;
  branchName: string;
  views: number;
  share: number;
};

type TopCategoryRow = {
  categoryId: string;
  categoryName: string;
  views: number;
  share: number;
};

type TopItemRow = {
  itemId: string;
  itemName: string;
  categoryName: string;
  views: number;
};

const RANGE_VALUES = new Set(["7d", "30d", "all"]);

const DEFAULT_RANGE: "7d" | "30d" | "all" = "7d";

function resolveRange(value: string | undefined): "7d" | "30d" | "all" {
  if (!value || !RANGE_VALUES.has(value)) return DEFAULT_RANGE;
  return value as "7d" | "30d" | "all";
}

const getRangeStartDate = (range: "7d" | "30d" | "all") => {
  if (range === "all") return null;
  const days = range === "7d" ? 6 : 29;
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() - days);
  return base;
};

const formatDateLabel = (date: Date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

const buildDailySeries = (
  map: Map<string, number>,
  start: Date | null
): DailyViewPoint[] => {
  if (!map.size && !start) return [];
  if (!start) {
    return Array.from(map.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, count]) => ({
        date: formatDateLabel(new Date(`${key}T00:00:00Z`)),
        count,
      }));
  }

  const series: DailyViewPoint[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const cursor = new Date(start);

  while (cursor <= today) {
    const key = cursor.toISOString().slice(0, 10);
    series.push({
      date: formatDateLabel(cursor),
      count: map.get(key) ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return series;
};

type AnalyticsPageProps = {
  searchParams: Promise<SearchParams>;
};

export default async function AnalyticsPage({
  searchParams,
}: AnalyticsPageProps) {
  const { range } = await searchParams;
  const rangeValue = resolveRange(range);
  const startDate = getRangeStartDate(rangeValue);

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

  const restaurantId = membership?.restaurant_id;
  if (!restaurantId) {
    redirect("/admin");
  }

  const eventsQuery = supabase
    .from("analytics_events")
    .select(
      "branch_id, category_id, item_id, event_type, device_type, language, session_id, created_at"
    )
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: true });

  if (startDate) {
    eventsQuery.gte("created_at", startDate.toISOString());
  }

  const [{ data: restaurant }, { data: events }, { data: branches }, { data: categories }, { data: items }] =
    await Promise.all([
      supabase
        .from("restaurants")
        .select("id, name")
        .eq("id", restaurantId)
        .maybeSingle(),
      eventsQuery,
      supabase
        .from("branches")
        .select("id, name")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("categories")
        .select("id, name_en, is_offers")
        .eq("restaurant_id", restaurantId),
      supabase
        .from("items")
        .select("id, name_en, category_id")
        .eq("restaurant_id", restaurantId),
    ]);

  if (!restaurant) {
    redirect("/admin");
  }

  const branchMap = new Map<string, string>(
    (branches ?? []).map((branch) => [branch.id, branch.name])
  );
  const categoryMap = new Map<
    string,
    { name: string; isOffers: boolean }
  >(
    (categories ?? []).map((category) => [
      category.id,
      {
        name: category.name_en ?? "Uncategorized",
        isOffers: Boolean(category.is_offers),
      },
    ])
  );
  const offerCategoryIds = new Set(
    (categories ?? [])
      .filter((category) => category.is_offers)
      .map((category) => category.id)
  );
  const itemMap = new Map<string, { name: string; categoryId: string | null }>(
    (items ?? []).map((item) => [
      item.id,
      { name: item.name_en ?? "Unnamed", categoryId: item.category_id },
    ])
  );

  const analyticsEvents: AnalyticsEvent[] = events ?? [];
  let offerSectionViews = 0;
  let offerItemViews = 0;
  analyticsEvents.forEach((event) => {
    if (!event.category_id || !offerCategoryIds.has(event.category_id)) {
      return;
    }
    if (event.event_type === "category_view") {
      offerSectionViews += 1;
    }
    if (event.event_type === "item_view") {
      offerItemViews += 1;
    }
  });

  const menuViews = analyticsEvents.filter(
    (event) => event.event_type === "menu_view"
  );
  const totalMenuViews = menuViews.length;
  const whatsappClicks = analyticsEvents.filter(
    (event) => event.event_type === "whatsapp_click"
  ).length;

  const dailyMap = new Map<string, number>();
  menuViews.forEach((event) => {
    const key = new Date(event.created_at).toISOString().slice(0, 10);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + 1);
  });
  const dailySeries = buildDailySeries(dailyMap, startDate);

  const branchCounts = new Map<string, number>();
  menuViews.forEach((event) => {
    if (!event.branch_id) return;
    branchCounts.set(
      event.branch_id,
      (branchCounts.get(event.branch_id) ?? 0) + 1
    );
  });
  const branchRows: BranchPerformanceRow[] = Array.from(branchCounts.entries())
    .map(([branchId, views]) => ({
      branchId,
      branchName: branchMap.get(branchId) ?? "Unknown branch",
      views,
      share: totalMenuViews ? views / totalMenuViews : 0,
    }))
    .sort((a, b) => b.views - a.views);

  const categoryCounts = new Map<string, number>();
  analyticsEvents.forEach((event) => {
    if (
      (event.event_type === "category_view" ||
        event.event_type === "item_view") &&
      event.category_id
    ) {
      categoryCounts.set(
        event.category_id,
        (categoryCounts.get(event.category_id) ?? 0) + 1
      );
    }
  });
  const totalCategoryViews = Array.from(categoryCounts.values()).reduce(
    (sum, val) => sum + val,
    0
  );
  const topCategories: TopCategoryRow[] = Array.from(
    categoryCounts.entries()
  )
    .map(([categoryId, views]) => ({
      categoryId,
      categoryName: categoryMap.get(categoryId)?.name ?? "Uncategorized",
      views,
      share: totalCategoryViews ? views / totalCategoryViews : 0,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);

  const itemCounts = new Map<string, number>();
  analyticsEvents.forEach((event) => {
    if (event.event_type === "item_view" && event.item_id) {
      itemCounts.set(
        event.item_id,
        (itemCounts.get(event.item_id) ?? 0) + 1
      );
    }
  });
  const topItems: TopItemRow[] = Array.from(itemCounts.entries())
    .map(([itemId, views]) => {
      const meta = itemMap.get(itemId);
      return {
        itemId,
        itemName: meta?.name ?? "Unknown",
        categoryName: meta?.categoryId
          ? categoryMap.get(meta.categoryId)?.name ?? "Uncategorized"
          : "Uncategorized",
        views,
      };
    })
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const sessionSet = new Set(
    analyticsEvents.map((event) => event.session_id).filter(Boolean) as string[]
  );
  const uniqueSessions = sessionSet.size || totalMenuViews;

  const deviceCounts = analyticsEvents.reduce(
    (acc, event) => {
      if (event.device_type === "mobile") acc.mobile += 1;
      else if (event.device_type === "desktop") acc.desktop += 1;
      return acc;
    },
    { mobile: 0, desktop: 0 }
  );

  const languageCounts = analyticsEvents.reduce<Record<string, number>>(
    (acc, event) => {
      const key = event.language ?? "unknown";
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const mostUsedLanguage =
    Object.entries(languageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "unknown";
  const languageLabel =
    mostUsedLanguage === "ar"
      ? "Arabic"
      : mostUsedLanguage === "en"
        ? "English"
        : "Unknown";

  const mobilePercentage =
    totalMenuViews > 0
      ? Math.round((deviceCounts.mobile / totalMenuViews) * 100)
      : 0;

  const deviceBreakdown = [
    {
      label: "Mobile",
      value: deviceCounts.mobile,
      percentage:
        totalMenuViews > 0
          ? Math.round((deviceCounts.mobile / totalMenuViews) * 100)
          : 0,
    },
    {
      label: "Desktop",
      value: deviceCounts.desktop,
      percentage:
        totalMenuViews > 0
          ? Math.round((deviceCounts.desktop / totalMenuViews) * 100)
          : 0,
    },
  ];

  const languageBreakdown = Object.entries(languageCounts).map(
    ([key, value]) => ({
      label: key === "ar" ? "Arabic" : key === "en" ? "English" : "Unknown",
      value,
    })
  );

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Insights
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">
            How customers interact with your menu.
          </p>
          <p className="text-xs text-muted-foreground">
            Restaurant: {restaurant.name}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangeSelector value={rangeValue} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Menu views" value={totalMenuViews} />
        <KpiCard title="Unique sessions" value={uniqueSessions} />
        <KpiCard title="Most used language" value={languageLabel} />
        <KpiCard title="Mobile traffic" value={`${mobilePercentage}%`} />
        <KpiCard title="WhatsApp clicks" value={whatsappClicks} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <KpiCard title="Offer section views" value={offerSectionViews} />
        <KpiCard title="Offer item views" value={offerItemViews} />
      </div>

      <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Views over time
            </h2>
            <p className="text-sm text-muted-foreground">
              Menu views per day in the selected range.
            </p>
          </div>
        </div>
        {dailySeries.length === 0 ? (
          <EmptyState message="No views recorded yet for this period." />
        ) : (
          <ViewsChart data={dailySeries} />
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Branch performance
          </h2>
          {branchRows.length === 0 ? (
            <EmptyState message="No branch data yet." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Branch</th>
                  <th className="py-2 text-right">Views</th>
                  <th className="py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {branchRows.map((row) => (
                  <tr key={row.branchId} className="border-t border-border/60">
                    <td className="py-2 font-medium text-foreground">
                      {row.branchName}
                    </td>
                    <td className="py-2 text-right">{row.views}</td>
                    <td className="py-2 text-right">
                      {Math.round(row.share * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Device & language
          </h2>
          {totalMenuViews === 0 ? (
            <EmptyState message="No device data yet." />
          ) : (
            <div className="space-y-6">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Device split
                </p>
                <div className="mt-2 space-y-2">
                  {deviceBreakdown.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-2xl border border-border px-3 py-2"
                    >
                      <span className="font-medium text-foreground">
                        {row.label}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {row.value} ({row.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
                  Languages
                </p>
                {languageBreakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No language data yet.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {languageBreakdown.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between rounded-2xl border border-border px-3 py-2"
                      >
                        <span className="font-medium text-foreground">
                          {row.label}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">
            Top categories
          </h2>
          {topCategories.length === 0 ? (
            <EmptyState message="No category interactions yet." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Category</th>
                  <th className="py-2 text-right">Views</th>
                  <th className="py-2 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {topCategories.map((row) => (
                  <tr key={row.categoryId} className="border-t border-border/60">
                    <td className="py-2 font-medium text-foreground">
                      {row.categoryName}
                    </td>
                    <td className="py-2 text-right">{row.views}</td>
                    <td className="py-2 text-right">
                      {Math.round(row.share * 100)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Top items</h2>
          {topItems.length === 0 ? (
            <EmptyState message="No item interactions yet." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-left">Category</th>
                  <th className="py-2 text-right">Views</th>
                </tr>
              </thead>
              <tbody>
                {topItems.map((row) => (
                  <tr key={row.itemId} className="border-t border-border/60">
                    <td className="py-2 font-medium text-foreground">
                      {row.itemName}
                    </td>
                    <td className="py-2 text-left text-muted-foreground">
                      {row.categoryName}
                    </td>
                    <td className="py-2 text-right">{row.views}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
      </div>
    </div>
  );
}

type KpiCardProps = {
  title: string;
  value: string | number;
};

const KpiCard = ({ title, value }: KpiCardProps) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
      {title}
    </p>
    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
    {message}
  </div>
);
