import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { loadAnalytics, AnalyticsRange } from "@/lib/analytics/loader";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { RangeSelector } from "./range-selector";
import { ViewsChart } from "./views-chart";

type SearchParams = { range?: string };

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

  return (
    <div className="mx-auto w-full max-w-7xl px-6 py-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
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
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard title="Menu views" value={analytics.kpis.menu_views} />
        <KpiCard title="Unique sessions" value={analytics.kpis.unique_sessions} />
        <KpiCard title="Category clicks" value={analytics.kpis.category_views} />
        <KpiCard title="Item views" value={analytics.kpis.item_views} />
        <KpiCard title="Modal opens" value={analytics.kpis.item_modal_opens} />
      </section>
      <section className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Favorites added" value={analytics.kpis.favorites} />
        <KpiCard title="Filters applied" value={analytics.kpis.filters} />
        <KpiCard title="Searches" value={analytics.kpis.searches} />
        <KpiCard title="Snapshot loads" value={analytics.kpis.snapshots} />
      </section>

      <SectionCard title="Views over time" subtitle="Menu views per day in the selected range.">
        {analytics.viewsSeries.length === 0 ? (
          <EmptyState message="No views yet." />
        ) : (
          <ViewsChart data={analytics.viewsSeries} />
        )}
      </SectionCard>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Device & language">
          {analytics.devices.every((d) => d.value === 0) ? (
            <EmptyState message="No device data yet." />
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Device split</p>
                <div className="mt-2 space-y-2">
                  {analytics.devices.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between rounded-2xl border border-border px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{row.label}</span>
                      <span className="text-sm text-muted-foreground">
                        {row.value} (
                        {analytics.kpis.menu_views > 0
                          ? Math.round((row.value / analytics.kpis.menu_views) * 100)
                          : 0}
                        %)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Languages</p>
                {analytics.languages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No language data yet.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {analytics.languages.map((row) => (
                      <div
                        key={row.label}
                        className="flex items-center justify-between rounded-2xl border border-border px-3 py-2"
                      >
                        <span className="font-medium text-foreground">
                          {row.label === "ar" ? "Arabic" : row.label === "en" ? "English" : row.label}
                        </span>
                        <span className="text-sm text-muted-foreground">{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Top search terms">
          {analytics.topSearchTerms.length === 0 ? (
            <EmptyState message="No search data yet." />
          ) : (
            <table className="w-full text-sm">
              <thead className="text-muted-foreground">
                <tr>
                  <th className="py-2 text-left">Term</th>
                  <th className="py-2 text-right">Count</th>
                </tr>
              </thead>
              <tbody>
                {analytics.topSearchTerms.map((row) => (
                  <tr key={row.term} className="border-t border-border/60">
                    <td className="py-2 font-medium text-foreground">{row.term}</td>
                    <td className="py-2 text-right">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <SectionCard title="Top categories">
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

        <SectionCard title="Top items">
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
      </div>

      <SectionCard title="Favorites insights" className="mt-6">
        {analytics.favoritesLeaderboard.length === 0 ? (
          <EmptyState message="No favorites yet." />
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Most favorited items</h3>
              <table className="mt-2 w-full text-sm">
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
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Favorites over time</h3>
              {analytics.favoritesSeries.length === 0 ? (
                <EmptyState message="No favorite activity yet." />
              ) : (
                <ViewsChart data={analytics.favoritesSeries} />
              )}
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Featured item performance" className="mt-6">
        {analytics.featured.length === 0 ? (
          <EmptyState message="No featured items activity yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Item</th>
                <th className="py-2 text-right">Views</th>
                <th className="py-2 text-right">Opens</th>
                <th className="py-2 text-right">Favorites</th>
                <th className="py-2 text-right">Engagement</th>
              </tr>
            </thead>
            <tbody>
              {analytics.featured.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-2 font-medium text-foreground">{row.name}</td>
                  <td className="py-2 text-right">{row.views}</td>
                  <td className="py-2 text-right">{row.opens}</td>
                  <td className="py-2 text-right">{row.favorites}</td>
                  <td className="py-2 text-right">{row.engagement}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Allergen avoidance" className="mt-6">
        {analytics.allergens.every((a) => a.count === 0) ? (
          <EmptyState message="No allergen filter usage yet." />
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {analytics.allergens.map((row) => (
              <div
                key={row.allergen}
                className="flex items-center justify-between rounded-2xl border border-border px-3 py-2 text-sm"
              >
                <span className="font-medium capitalize text-foreground">{row.allergen}</span>
                <span className="text-muted-foreground">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Modifier engagement" className="mt-6">
        {analytics.modifiers.length === 0 ? (
          <EmptyState message="No modifier interactions yet." />
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-2 text-left">Modifier group</th>
                <th className="py-2 text-right">Group opens</th>
                <th className="py-2 text-right">Option selects</th>
                <th className="py-2 text-right">Option removes</th>
              </tr>
            </thead>
            <tbody>
              {analytics.modifiers.map((row) => (
                <tr key={row.id} className="border-t border-border/60">
                  <td className="py-2 font-medium text-foreground">{row.id}</td>
                  <td className="py-2 text-right">{row.opens}</td>
                  <td className="py-2 text-right">{row.selects}</td>
                  <td className="py-2 text-right">{row.removes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </SectionCard>

      <SectionCard title="Funnels" className="mt-6">
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
                      <div
                        className="h-2 rounded-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

const SectionCard = ({
  title,
  children,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <section className={`mt-6 space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm ${className ?? ""}`}>
    <div>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);

type KpiCardProps = {
  title: string;
  value: string | number;
};

const KpiCard = ({ title, value }: KpiCardProps) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{title}</p>
    <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
  </div>
);

const EmptyState = ({ message }: { message: string }) => (
  <div className="rounded-2xl border border-dashed border-border/70 bg-secondary/30 px-4 py-6 text-center text-sm text-muted-foreground">
    {message}
  </div>
);
