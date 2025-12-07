import { redirect, notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import BranchPricingClient, {
  BranchPricingCategory,
  BranchPricingItem,
  BranchPricingOverride,
} from "./branch-pricing-client";

type PageProps = {
  params: Promise<{ branchId: string }>;
};

export default async function BranchPricingPage({ params }: PageProps) {
  const { branchId } = await params;
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
    .eq("user_id", user!.id)
    .maybeSingle();

  const restaurantId = membership?.restaurant_id;

  if (!restaurantId) {
    redirect("/admin");
  }

  const { data: branch } = await supabase
    .from("branches")
    .select("id, name, restaurant_id")
    .eq("id", branchId)
    .maybeSingle();

  if (!branch || branch.restaurant_id !== restaurantId) {
    notFound();
  }

  const [{ data: categories }, { data: items }, { data: overrides }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name_en, name_ar, display_order")
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true }),
      supabase
        .from("items")
        .select(
          "id, category_id, name_en, name_ar, price, secondary_price, is_available, display_order"
        )
        .eq("restaurant_id", restaurantId)
        .order("display_order", { ascending: true }),
      supabase
        .from("item_branch_overrides")
        .select("item_id, price, secondary_price, is_available, display_order")
        .eq("restaurant_id", restaurantId)
        .eq("branch_id", branchId),
    ]);

  return (
    <div className="space-y-6">
      <BranchPricingClient
        branch={{ id: branch.id, name: branch.name }}
        categories={(categories ?? []) as BranchPricingCategory[]}
        items={(items ?? []) as BranchPricingItem[]}
        overrides={(overrides ?? []) as BranchPricingOverride[]}
      />
    </div>
  );
}
