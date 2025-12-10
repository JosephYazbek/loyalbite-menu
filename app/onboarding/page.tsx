import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: membership } = await supabase
    .from("restaurant_users")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  if (membership && membership.length > 0) {
    redirect("/admin");
  }

  return (
    <OnboardingClient
      defaultEmail={user.email ?? ""}
      defaultName={(user.user_metadata?.full_name as string | undefined) ?? ""}
    />
  );
}
