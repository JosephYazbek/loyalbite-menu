import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { AdminShell } from "@/components/admin-shell";

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type MembershipRecord = {
  id: string;
  role: string;
  restaurant: RestaurantRecord | null;
};

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("restaurant_users")
    .select(
      `
      id,
      role,
      restaurant:restaurant_id (
        id,
        name,
        slug,
        logo_url
      )
    `
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const safeMemberships: MembershipRecord[] =
    (memberships as unknown as MembershipRecord[]) ?? [];

  return (
    <AdminShell
      user={{
        id: user.id,
        email: user.email!,
        fullName:
          (user.user_metadata?.full_name as string | undefined) ?? undefined,
        avatarUrl:
          (user.user_metadata?.avatar_url as string | undefined) ?? undefined,
      }}
      memberships={safeMemberships.map((record) => ({
        id: record.id,
        role: record.role ?? "editor",
        restaurant: {
          id: record.restaurant?.id ?? "",
          name: record.restaurant?.name ?? "",
          slug: record.restaurant?.slug ?? "",
          logoUrl: record.restaurant?.logo_url ?? null,
        },
      }))}
    >
      {children}
    </AdminShell>
  );
}
