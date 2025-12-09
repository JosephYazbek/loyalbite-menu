import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { ProfileForm } from "./profile-form";

export default async function ProfileSettingsPage() {
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
    .limit(1)
    .maybeSingle();

  const restaurantId = membership?.restaurant_id;

  if (!restaurantId) {
    redirect("/admin");
  }

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select(
      `
        id,
        name,
        slug,
        description,
        description_en,
        description_ar,
        phone,
        whatsapp_phone,
        email,
        website,
        primary_color,
        default_language,
        logo_url,
        cover_image_url
      `
    )
    .eq("id", restaurantId)
    .maybeSingle();

  if (!restaurant) {
    redirect("/admin");
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-6">
      <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Settings
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">
          Restaurant profile & branding
        </h1>
        <p className="text-sm text-muted-foreground">
          Update your public-facing details, contact info, and menu accents.
        </p>
      </div>

        <ProfileForm
          restaurant={{
            id: restaurant.id,
            name: restaurant.name,
            slug: restaurant.slug,
            logoUrl: restaurant.logo_url,
            coverImageUrl: restaurant.cover_image_url,
            descriptionEn: restaurant.description_en,
            descriptionAr: restaurant.description_ar,
            profileMeta: restaurant.description,
            phone: restaurant.phone,
            whatsappPhone: restaurant.whatsapp_phone,
            email: restaurant.email,
            website: restaurant.website,
            primaryColor: restaurant.primary_color,
            defaultLanguage: (restaurant.default_language as
              | "en"
              | "ar"
              | "both"
              | null) ?? "en",
          }}
        />
      </div>
    </div>
  );
}
