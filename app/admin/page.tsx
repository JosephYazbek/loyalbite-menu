import Link from "next/link";
import { redirect } from "next/navigation";
import { Activity, MapPin, Settings, UtensilsCrossed } from "lucide-react";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { calculateMenuHealth } from "@/lib/menu-health";
import { Button } from "@/components/ui/button";

type EventRow = {
  event_type: string;
};

const QUICK_ACTIONS = [
  {
    title: "Manage menu",
    description: "Edit items, prices, and categories.",
    href: "/admin/menu",
    icon: UtensilsCrossed,
  },
  {
    title: "Branches",
    description: "Update locations and QR links.",
    href: "/admin/branches",
    icon: MapPin,
  },
  {
    title: "Analytics",
    description: "See views, language mix, and devices.",
    href: "/admin/analytics",
    icon: Activity,
  },
  {
    title: "Branding",
    description: "Logo, cover, contact info, and colors.",
    href: "/admin/settings/profile",
    icon: Settings,
  },
];

export default async function AdminHome() {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select(
      `
        restaurant_id,
        restaurant:restaurant_id (
          id,
          name,
          slug
        )
      `
    )
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership?.restaurant_id) {
    redirect("/admin");
  }

  const restaurant = membership.restaurant;

  const since = new Date();
  since.setDate(since.getDate() - 6);

  const [{ data: eventsData }, menuHealth] = await Promise.all([
    supabase
      .from("analytics_events")
      .select("event_type")
      .eq("restaurant_id", membership.restaurant_id)
      .gte("created_at", since.toISOString()),
    calculateMenuHealth(supabase, membership.restaurant_id),
  ]);

  const events: EventRow[] = eventsData ?? [];
  const menuViews = events.filter((event) => event.event_type === "menu_view")
    .length;
  const whatsappClicks = events.filter(
    (event) => event.event_type === "whatsapp_click"
  ).length;

  const healthLabel =
    menuHealth.score >= 85
      ? "Excellent"
      : menuHealth.score >= 70
        ? "Good"
        : menuHealth.score >= 50
          ? "Needs work"
          : "Poor";

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Dashboard
          </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
            Welcome back{restaurant?.name ? `, ${restaurant.name}` : ""}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Track menu health, recent engagement, and jump back into your tools.
          </p>
        </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Menu health
              </p>
              <div className="mt-3 flex items-end gap-3">
                <span className="text-4xl font-semibold text-foreground">
                  {menuHealth.score}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / 100 · {healthLabel}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {menuHealth.issues[0]?.title ??
                  "Add photos, descriptions, and translations to keep improving."}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/menu/health">View details</Link>
            </Button>
          </div>
        </section>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Last 7 days
              </p>
              <h2 className="mt-2 text-xl font-semibold text-foreground">
                Engagement snapshot
              </h2>
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Menu views
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {menuViews}
              </p>
              <p className="text-xs text-muted-foreground">
                Views recorded since {since.toLocaleDateString()}
              </p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/50 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                WhatsApp clicks
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {whatsappClicks}
              </p>
              <p className="text-xs text-muted-foreground">
                Driven by QR scans and menu browsing.
              </p>
            </div>
          </div>
          <Button asChild className="mt-4 w-full">
            <Link href="/admin/analytics">Open analytics</Link>
          </Button>
        </section>
      </div>

        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Quick actions
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {QUICK_ACTIONS.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="flex items-start gap-4 rounded-2xl border border-border/70 bg-background/50 p-4 transition hover:border-primary/60 hover:shadow-sm"
                >
                  <span className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {action.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
