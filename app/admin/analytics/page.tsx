import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { loadAnalytics, AnalyticsRange } from "@/lib/analytics/loader";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { RangeSelector } from "./range-selector";
import { ViewsChart } from "./views-chart";
import { SearchBarChart } from "./search-bar-chart";
import { AnalyticsTabs } from "./analytics-tabs";

type SearchParams = { range?: string };

const ALLERGEN_LABELS: Record<string, string> = {
  dairy: "Dairy",
  nuts: "Nuts",
  eggs: "Eggs",
  shellfish: "Shellfish",
  soy: "Soy",
  sesame: "Sesame",
};

export const dynamic = "force-dynamic";

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const rangeParam = typeof params?.range === "string" ? params.range : undefined;
  const rangeValue = (["7d", "30d", "90d", "all"].includes(rangeParam ?? "")
    ? rangeParam
    : "7d") as AnalyticsRange;

  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const restaurantId = membership?.restaurant_id;
  if (!restaurantId) redirect("/admin");

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name")
    .eq("id", restaurantId)
    .maybeSingle();
  if (!restaurant) redirect("/admin");

  const analytics = await loadAnalytics({ restaurantId, range: rangeValue });

  const deviceTrendsMap = new Map(analytics.deviceTrends?.map((row) => [row.label, row.value]));
  const languageTrendsMap = new Map(analytics.languageTrends?.map((row) => [row.label, row.value]));

  const heatmapMatrix = analytics.allergenHeatmap.reduce<Record<string, Record<string, number>>>((acc, row) => {
    acc[row.category] = acc[row.category] ?? {};
    acc[row.category][row.allergen] = row.count;
    return acc;
  }, {});

  const overviewTab = (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Menu views" value={analytics.kpis.menu_views} />
        <KpiCard title="Unique sessions" value={analytics.kpis.unique_sessions} />
        <KpiCard title="Category clicks" value={analytics.kpis.category_views} />
        <KpiCard title="Item views" value={analytics.kpis.item_views} />
        <KpiCard title="Modal opens" value={analytics.kpis.item_modal_opens} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Favorites added" value={analytics.kpis.favorites} />
        <KpiCard title="Filters applied" value={analytics.kpis.filters} />
        <KpiCard title="Searches" value={analytics.kpis.searches} />
        <KpiCard title="Snapshot loads" value={analytics.kpis.snapshots} />
      </div>
      <SectionCard title="Views over time" subtitle="Menu views per day in the selected range.">
        {analytics.viewsSeries.length === 0 ? (
          <EmptyState message="No views yet." />
        ) : (
          <ViewsChart data={analytics.viewsSeries} />
        )}
      </SectionCard>
    </>
  );

  const searchTab = (
    <>
      <SectionCard title="Top search terms">
        {analytics.topSearchTerms.length === 0 ? (
          <EmptyState message="No search data yet." />
        ) : (
          <SearchBarChart data={analytics.topSearchTerms.slice(0, 20)} />
        )}
      </SectionCard>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Zero result searches" subtitle="Terms without any matching items.">
          {analytics.searchZeroResults.length === 0 ? (
            <EmptyState message="No failed searches detected." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Term</th>
                  <th className="py-2 text-right">Searches</th>
                </tr>
              </thead>
              <tbody>
                {analytics.searchZeroResults.map((row) => (
                  <tr key={row.term} className="border-t border-border/60">
                    <td className="py-2 font-medium text-foreground">{row.term}</td>
                    <td className="py-2 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
        <SectionCard title="Search conversion">
          <dl className="grid gap-4 md:grid-cols-2">
            <StatCard
              label="Total searches"
              value={analytics.searchConversion.totalSearches}
              helper="Across the selected period."
            />
            <StatCard
              label="Zero results"
              value={`${analytics.searchConversion.zeroResults} (${analytics.searchConversion.zeroRate}%)`}
              helper="Searches with no matching dishes."
            />
            <StatCard
              label="Views per search"
              value={`${analytics.searchConversion.viewRate}%`}
              helper="Item views relative to searches."
            />
            <StatCard
              label="Favorites per search"
              value={`${analytics.searchConversion.favoriteRate}%`}
              helper="Favorites driven by search traffic."
            />
          </dl>
        </SectionCard>
      </div>
    </>
  );

  const favoritesTab = (
    <>
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard title="Favorites leaderboard">
          {analytics.favoritesLeaderboard.length === 0 ? (
            <EmptyState message="No favorites yet." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Item</th>
                  <th className="py-2 text-left">Category</th>
                  <th className="py-2 text-right">Favorites</th>
                </tr>
              </thead>
              <tbody>
                {analytics.favoritesLeaderboard.map((row) => (
                  <tr key={row.id} className="border-t border-border/60">
                    <td className="py-2 font-medium text-foreground">{row.name}</td>
                    <td className="py-2 text-left text-muted-foreground">{row.category}</td>
                    <td className="py-2 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
        <SectionCard title="Favorites over time">
          {analytics.favoritesSeries.length === 0 ? (
            <EmptyState message="No favorite activity yet." />
          ) : (
            <ViewsChart data={analytics.favoritesSeries} />
          )}
        </SectionCard>
      </div>
      <SectionCard title="Favorite rate">
        <StatCard
          label="Favorites per 100 item views"
          value={
            analytics.kpis.item_views > 0
              ? ((analytics.kpis.favorites / analytics.kpis.item_views) * 100).toFixed(1)
              : "0"
          }
          helper="How often a viewed item becomes a favorite."
        />
      </SectionCard>
    </>
  );

  const itemsTab = (
    <SectionCard title="Items leaderboard">
      {analytics.topItems.length === 0 ? (
        <EmptyState message="No item interactions yet." />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Item</th>
              <th className="py-2 text-left">Category</th>
              <th className="py-2 text-right">Views</th>
              <th className="py-2 text-right">Modal opens</th>
              <th className="py-2 text-right">Favorites</th>
              <th className="py-2 text-right">Featured views</th>
              <th className="py-2 text-right">Popularity</th>
            </tr>
          </thead>
          <tbody>
            {analytics.topItems.map((row) => (
              <tr key={row.id} className="border-t border-border/60">
                <td className="py-2 font-medium text-foreground">{row.name}</td>
                <td className="py-2 text-left text-muted-foreground">{row.category}</td>
                <td className="py-2 text-right">{row.views}</td>
                <td className="py-2 text-right">{row.modalOpens}</td>
                <td className="py-2 text-right">{row.favorites}</td>
                <td className="py-2 text-right">{row.featuredViews}</td>
                <td className="py-2 text-right">{row.popularity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );

  const categoriesTab = (
    <SectionCard title="Category intelligence">
      {analytics.categories.length === 0 ? (
        <EmptyState message="No category interactions yet." />
      ) : (
        <table className="w-full text-sm">
          <thead className="text-muted-foreground">
            <tr>
              <th className="py-2 text-left">Category</th>
              <th className="py-2 text-right">Views</th>
              <th className="py-2 text-right">Modal opens</th>
              <th className="py-2 text-right">Favorites</th>
              <th className="py-2 text-right">Engagement</th>
            </tr>
          </thead>
          <tbody>
            {analytics.categories.map((row) => (
              <tr key={row.id} className="border-t border-border/60">
                <td className="py-2 font-medium text-foreground">{row.name}</td>
                <td className="py-2 text-right">{row.views}</td>
                <td className="py-2 text-right">{row.modalOpens}</td>
                <td className="py-2 text-right">{row.favorites}</td>
                <td className="py-2 text-right">{row.engagement}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </SectionCard>
  );

  const allergensTab = (
    <>
      <SectionCard title="Allergen avoidance">
        {analytics.allergens.every((a) => a.count === 0) ? (
          <EmptyState message="No allergen filter usage yet." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.allergens.map((row) => (
              <div key={row.allergen} className="rounded-2xl border border-border px-4 py-3">
                <p className="text-sm font-semibold text-foreground capitalize">{ALLERGEN_LABELS[row.allergen] ?? row.allergen}</p>
                <p className="text-lg font-semibold text-foreground">{row.count}</p>
                <p className="text-xs text-muted-foreground">{row.percent}% of menu views</p>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
      <SectionCard title="Allergen heatmap" subtitle="How many menu items in each category contain specific allergens.">
        {Object.keys(heatmapMatrix).length === 0 ? (
          <EmptyState message="No allergen data for menu items." />
        ) : (
          <div className="w-full overflow-auto">
            <table className="min-w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Category</th>
                  {Object.keys(ALLERGEN_LABELS).map((key) => (
                    <th key={key} className="py-2 text-right capitalize">
                      {ALLERGEN_LABELS[key]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(heatmapMatrix).map(([category, row]) => (
                  <tr key={category} className="border-t border-border/60">
                    <td className="py-2 font-medium text-foreground">{category}</td>
                    {Object.keys(ALLERGEN_LABELS).map((key) => (
                      <td key={key} className="py-2 text-right">
                        {row[key] ?? 0}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </>
  );

  const modifiersTab = (
    <>
      <SectionCard title="Modifier groups">
        {analytics.modifiers.length === 0 ? (
          <EmptyState message="No modifier activity recorded." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Group</th>
                <th className="py-2 text-right">Opens</th>
                <th className="py-2 text-right">Selects</th>
                <th className="py-2 text-right">Removes</th>
              </tr>
            </thead>
            <tbody>
              {analytics.modifiers.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-2 font-medium text-foreground">{row.name}</td>
                  <td className="py-2 text-right">{row.opens}</td>
                  <td className="py-2 text-right">{row.selects}</td>
                  <td className="py-2 text-right">{row.removes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
      <SectionCard title="Modifier engagement by item">
        {analytics.modifierItems.length === 0 ? (
          <EmptyState message="No item-level modifier interactions yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-right">Opens</th>
                <th className="py-2 text-right">Selects</th>
                <th className="py-2 text-right">Removes</th>
              </tr>
            </thead>
            <tbody>
              {analytics.modifierItems.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-2 font-medium text-foreground">{row.name}</td>
                  <td className="py-2 text-right">{row.opens}</td>
                  <td className="py-2 text-right">{row.selects}</td>
                  <td className="py-2 text-right">{row.removes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>
    </>
  );

  const funnelsTab = (
    <SectionCard title="Funnels">
      <div className="grid gap-4 md:grid-cols-2">
        {[analytics.funnels.funnelA, analytics.funnels.funnelB].map((funnel, idx) => (
          <div key={idx} className="space-y-2 rounded-2xl border border-border p-4">
            {funnel.map((step, index) => {
              const prev = index === 0 ? step.value : funnel[index - 1].value;
              const pct = prev > 0 ? Math.round((step.value / prev) * 100) : 0;
              return (
                <div key={step.label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{step.label}</span>
                    <span className="text-muted-foreground">
                      {step.value} {index > 0 ? `(${pct}%)` : ""}
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-muted">
                    <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, pct)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </SectionCard>
  );

  const deviceLanguageTab = (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Device split">
        {analytics.devices.every((row) => row.value === 0) ? (
          <EmptyState message="No device data yet." />
        ) : (
          <div className="space-y-3">
            {analytics.devices.map((row) => {
              const prev = deviceTrendsMap.get(row.label) ?? 0;
              const delta = row.value - prev;
              return (
                <div key={row.label} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{formatDelta(delta)}</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{row.value}</p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
      <SectionCard title="Language mix">
        {analytics.languages.length === 0 ? (
          <EmptyState message="No language data yet." />
        ) : (
          <div className="space-y-3">
            {analytics.languages.map((row) => {
              const prev = languageTrendsMap.get(row.label) ?? 0;
              const delta = row.value - prev;
              const friendly =
                row.label === "ar" ? "Arabic" : row.label === "en" ? "English" : row.label ?? "Unknown";
              return (
                <div key={row.label} className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
                  <div>
                    <p className="font-semibold text-foreground">{friendly}</p>
                    <p className="text-xs text-muted-foreground">{formatDelta(delta)}</p>
                  </div>
                  <p className="text-lg font-semibold text-foreground">{row.value}</p>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );

  const tabs = [
    { id: "overview", label: "Overview", content: overviewTab },
    { id: "search", label: "Search", content: searchTab },
    { id: "favorites", label: "Favorites", content: favoritesTab },
    { id: "items", label: "Items", content: itemsTab },
    { id: "categories", label: "Categories", content: categoriesTab },
    { id: "allergens", label: "Allergens", content: allergensTab },
    { id: "modifiers", label: "Modifiers", content: modifiersTab },
    { id: "funnels", label: "Funnels", content: funnelsTab },
    { id: "devices", label: "Devices & language", content: deviceLanguageTab },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Insights</p>
          <h1 className="text-2xl font-semibold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">How customers interact with your menu.</p>
          <p className="text-xs text-muted-foreground">Restaurant: {restaurant.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <RangeSelector value={rangeValue} />
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/menu/health">Menu health</Link>
          </Button>
        </div>
      </div>

      <div className="mt-8">
        <AnalyticsTabs tabs={tabs} defaultValue="overview" />
      </div>
    </div>
  );
}

const SectionCard = ({
  title,
  children,
  subtitle,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
    <div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);

const KpiCard = ({ title, value }: { title: string; value: string | number }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
  </div>
);

const StatCard = ({ label, value, helper }: { label: string; value: string | number; helper: string }) => (
  <div className="rounded-2xl border border-border px-4 py-3">
    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{helper}</p>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
    {message}
  </div>
);

const formatDelta = (delta: number) => {
  if (delta === 0) return "No change vs earlier period";
  return delta > 0 ? `+${delta} vs previous window` : `${delta} vs previous window`;
};
