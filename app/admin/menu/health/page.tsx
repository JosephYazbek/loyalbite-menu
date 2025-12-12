import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { calculateMenuHealth, MenuHealthIssue, MenuHealthScore } from "@/lib/menu-health";
import { Button } from "@/components/ui/button";

const breakdownLabels: Record<keyof MenuHealthScore["breakdown"], { label: string; hint: string }> = {
  photos: { label: "Photos", hint: "Items with appetizing photos get more taps." },
  descriptions: { label: "Descriptions", hint: "Short sentences help guests imagine the dish." },
  translations: { label: "Translations", hint: "Support both English and Arabic diners." },
  tags: { label: "Tags", hint: "Highlight dietary info or selling points." },
  structure: { label: "Structure", hint: "Balanced categories keep menus scannable." },
  performance: { label: "Performance", hint: "Popular items get consistent views." },
};

const severityStyles: Record<MenuHealthIssue["severity"], { badge: string; text: string }> = {
  high: { badge: "bg-red-100 text-red-700", text: "text-red-700" },
  medium: { badge: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  low: { badge: "bg-blue-100 text-blue-700", text: "text-blue-700" },
};

const getScoreLabel = (score: number) => {
  if (score >= 85) return "Excellent";
  if (score >= 70) return "Good";
  if (score >= 50) return "Needs work";
  return "Poor";
};

export default async function MenuHealthPage() {
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

  const [restaurantRes, health] = await Promise.all([
    supabase.from("restaurants").select("name").eq("id", restaurantId).maybeSingle(),
    calculateMenuHealth(supabase, restaurantId),
  ]);

  const restaurantName = restaurantRes?.data?.name ?? "Restaurant";
  const scoreLabel = getScoreLabel(health.score);

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Menu</p>
          <h1 className="text-2xl font-semibold text-foreground">Menu Health</h1>
          <p className="text-sm text-muted-foreground">How complete and effective your menu is.</p>
        </div>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Overall score</p>
              <div className="mt-3 flex items-end gap-4">
                <span className="text-6xl font-semibold text-foreground">{health.score}</span>
                <span className="text-lg font-medium text-muted-foreground">/ 100 · {scoreLabel}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">
                Based on photos, descriptions, translations, structure, tags, and recent guest engagement.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-secondary/50 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Suggested next step</p>
              {health.issues.length === 0 ? (
                <div className="mt-3 text-sm text-muted-foreground">
                  Your menu looks great. Keep adding vibrant photos and testing new dishes!
                </div>
              ) : (
                <div className="mt-3 space-y-1">
                  <p className="text-base font-semibold text-foreground">{health.issues[0].title}</p>
                  <p className="text-sm text-muted-foreground">{health.issues[0].description}</p>
                </div>
              )}
              <div className="mt-4">
                <Button asChild variant="outline">
                  <Link href="/admin/menu/items">Manage menu</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Breakdown</h2>
              <p className="text-sm text-muted-foreground">See how each dimension contributes to your score.</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Object.entries(breakdownLabels).map(([key, meta]) => {
              const value = health.breakdown[key as keyof typeof breakdownLabels];
              return (
                <div key={key} className="rounded-2xl border border-border bg-background px-4 py-3">
                  <div className="flex items-center justify-between text-sm font-medium text-foreground">
                    <span>{meta.label}</span>
                    <span>{value}%</span>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-secondary">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${value}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">{meta.hint}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Issues & suggestions</h2>
              <p className="text-sm text-muted-foreground">Sorted by severity — tackle the big wins first.</p>
            </div>
          </div>
          {health.issues.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 bg-secondary/40 px-4 py-6 text-center text-sm text-muted-foreground">
              Your menu looks great! Keep adding photos and testing new dishes for even better performance.
            </div>
          ) : (
            <div className="space-y-4">
              {health.issues.map((issue) => {
                const severity = severityStyles[issue.severity];
                return (
                  <div key={issue.id} className="rounded-2xl border border-border bg-background px-4 py-3 shadow-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${severity.badge}`}>
                        {issue.severity.toUpperCase()}
                      </span>
                      <p className="text-base font-semibold text-foreground">{issue.title}</p>
                      {issue.affectedCount !== undefined && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-muted-foreground">
                          {issue.affectedCount} affected
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{issue.description}</p>
                    {issue.hint && <p className={`mt-2 text-xs ${severity.text}`}>{issue.hint}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Menu metrics</h2>
              <p className="text-sm text-muted-foreground">Key numbers behind your score.</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total items" value={health.metrics.totalItems} />
            <MetricCard
              label="Items with photos"
              value={`${health.metrics.itemsWithImage} (${Math.round(
                (health.metrics.itemsWithImage / Math.max(health.metrics.totalItems, 1)) * 100
              )}%)`}
            />
            <MetricCard
              label="Items with descriptions"
              value={`${health.metrics.itemsWithDescriptionEn} (${Math.round(
                (health.metrics.itemsWithDescriptionEn / Math.max(health.metrics.totalItems, 1)) * 100
              )}%)`}
            />
            <MetricCard
              label="Items with Arabic content"
              value={`${health.metrics.itemsWithDescriptionAr} (${Math.round(
                (health.metrics.itemsWithDescriptionAr / Math.max(health.metrics.totalItems, 1)) * 100
              )}%)`}
            />
            <MetricCard
              label="Tagged items"
              value={`${health.metrics.itemsWithAnyTag} (${Math.round(
                (health.metrics.itemsWithAnyTag / Math.max(health.metrics.totalItems, 1)) * 100
              )}%)`}
            />
            <MetricCard
              label="Categories"
              value={`${health.metrics.categories.length}`}
              helper={
                health.metrics.categories.length > 0
                  ? `${health.metrics.categories
                      .map((category) => `${category.name_en ?? "Category"} (${category.itemCount})`)
                      .join(", ")}`
                  : "No categories yet"
              }
            />
          </div>
        </section>
      </div>
    </div>
  );
}

const MetricCard = ({ label, value, helper }: { label: string; value: string | number; helper?: string }) => (
  <div className="rounded-2xl border border-border bg-background/80 px-4 py-3 shadow-sm">
    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
    <p className="mt-2 text-lg font-semibold text-foreground">{value}</p>
    {helper && <p className="mt-1 text-xs text-muted-foreground">{helper}</p>}
  </div>
);
