import { unstable_noStore as noStore } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ restaurantSlug: string }>;
};

export default async function PublicRestaurantRedirect({ params }: PageProps) {
  const { restaurantSlug } = await params;
  noStore();
  const supabase = await createSupabaseServerClient();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, slug")
    .eq("slug", restaurantSlug)
    .maybeSingle();

  if (!restaurant) {
    notFound();
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("slug")
    .eq("restaurant_id", restaurant.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (branch?.slug) {
    redirect(`/m/${restaurant.slug}/${branch.slug}`);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center text-slate-700">
      <div className="max-w-md space-y-3">
        <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
          LoyalBite Menu
        </p>
        <h1 className="text-3xl font-semibold">Menu Coming Soon</h1>
        <p className="text-sm text-slate-500">
          This restaurant doesn&apos;t have an active branch yet. Please check
          back later or contact the restaurant for more information.
        </p>
      </div>
    </div>
  );
}
