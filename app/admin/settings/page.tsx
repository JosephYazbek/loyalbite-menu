import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeSettingsPanel } from "./theme-settings-panel";
import { DangerZonePanel } from "./danger-zone-panel";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export default async function SettingsPage() {
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
        role,
        restaurant_id,
        restaurant:restaurant_id (
          id,
          name
        )
      `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const isOwner = membership?.role === "owner";
  const restaurantId = membership?.restaurant_id ?? null;
  const restaurantName = membership?.restaurant?.name ?? "your restaurant";

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Preferences
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
            Settings
          </h1>
          <p className="text-sm text-muted-foreground">
            Tune how LoyalBite looks and feels for every member of your team.
          </p>
        </div>

        <ThemeSettingsPanel />
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Profile
              </p>
              <h2 className="text-xl font-semibold text-foreground">
                Restaurant profile & branding
              </h2>
              <p className="text-sm text-muted-foreground">
                Update descriptions, upload a cover image, and wire up contact
                channels for your public menu.
              </p>
            </div>
            <Button asChild className="mt-4 w-full md:mt-0 md:w-auto">
              <Link href="/admin/settings/profile">Open profile settings</Link>
            </Button>
          </div>
        </section>
        {isOwner && (
          <section className="rounded-3xl border border-border bg-card p-6 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  Team
                </p>
                <h2 className="text-xl font-semibold text-foreground">
                  Invite teammates
                </h2>
                <p className="text-sm text-muted-foreground">
                  Generate invite codes for staff members and monitor pending
                  invitations.
                </p>
              </div>
              <Button asChild className="mt-4 w-full md:mt-0 md:w-auto">
                <Link href="/admin/settings/invitations">Manage invites</Link>
              </Button>
            </div>
          </section>
        )}
        {restaurantId && (
          <DangerZonePanel
            restaurantId={restaurantId}
            restaurantName={restaurantName}
            role={membership?.role ?? "staff"}
          />
        )}
      </div>
    </div>
  );
}
