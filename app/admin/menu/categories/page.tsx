// app/admin/menu/categories/page.tsx
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { CategoriesClient } from "./components/categories-client";
import type { Category } from "@/types/category";

export default async function CategoriesPage() {
  const supabase = await createSupabaseServerClient();

  // 1) Get user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 2) Get restaurant_id from membership
  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("restaurant_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership?.restaurant_id) {
    throw new Error("No restaurant found for this user");
  }

  const restaurantId = membership.restaurant_id;

  // 3) Load restaurant info
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("id, name, slug, logo_url")
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) throw new Error("Restaurant not found");

  // 4) Load categories
  const { data: categories } = await supabase
    .from("categories")
    .select("*")
    .eq("restaurant_id", restaurantId)
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
        <CategoriesClient
          restaurantName={restaurant.name}
          restaurantId={restaurantId}
          initialCategories={(categories ?? []) as Category[]}
        />
      </div>
    </div>
  );
}
