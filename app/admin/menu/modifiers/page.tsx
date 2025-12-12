import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { ModifiersClient } from "./components/modifiers-client";

export default async function ModifiersPage() {
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

  if (!membership?.restaurant_id) {
    redirect("/onboarding");
  }

  const { data: modifiers } = await supabase
    .from("modifiers")
    .select("id, restaurant_id, name, min_choices, max_choices, modifier_options(id, name, price)")
    .eq("restaurant_id", membership.restaurant_id)
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <ModifiersClient initialModifiers={modifiers ?? []} />
    </div>
  );
}
