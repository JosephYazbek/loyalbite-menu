import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { InviteManager } from "./invite-manager";
import { Button } from "@/components/ui/button";

export default async function InvitationsSettingsPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: ownerMembership } = await supabase
    .from("restaurant_users")
    .select(
      `
      restaurant_id,
      role,
      restaurant:restaurant_id (
        id,
        name
      )
    `
    )
    .eq("user_id", user.id)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!ownerMembership?.restaurant_id) {
    redirect("/admin");
  }

  const { data: invites } = await supabase
    .from("restaurant_invites")
    .select(
      `
        id,
        email,
        role,
        code,
        expires_at,
        used,
        created_at
      `
    )
    .eq("restaurant_id", ownerMembership.restaurant_id)
    .order("created_at", { ascending: false });

  const adminClient = getSupabaseAdminClient();
  const { data: memberRows } = await adminClient
    .from("restaurant_users")
    .select("id, role, user_id")
    .eq("restaurant_id", ownerMembership.restaurant_id);

  const memberDetails = await Promise.all(
    (memberRows ?? []).map(async (member) => {
      const { data: userData } =
        await adminClient.auth.admin.getUserById(member.user_id);
      return {
        id: member.id,
        userId: member.user_id,
        role: member.role,
        email: userData.user?.email ?? "Unknown member",
      };
    })
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Settings
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              Team invitations
            </h1>
            <p className="text-sm text-muted-foreground">
              Generate invite links for teammates to join{" "}
              <span className="font-semibold text-foreground">
                {ownerMembership.restaurant?.name}
              </span>
              .
            </p>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/settings">← Back to settings</Link>
          </Button>
        </div>

        <InviteManager
          restaurantId={ownerMembership.restaurant_id}
          currentUserId={user.id}
          invites={(invites ?? []).map((invite) => ({
            id: invite.id,
            email: invite.email,
            role: invite.role,
            code: invite.code,
            expiresAt: invite.expires_at,
            used: invite.used,
            createdAt: invite.created_at,
          }))}
          members={memberDetails}
        />
      </div>
    </div>
  );
}
