import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { determineInitialLanguage, resolveLanguageParam } from "@/lib/language";
import { parseRestaurantProfileMeta } from "@/lib/restaurant-profile";
import MicrositeClient from "./microsite-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ restaurantSlug: string }>;
  searchParams: Promise<{ lang?: string | string[] }>;
};

export default async function RestaurantMicrositePage({
  params,
  searchParams,
}: PageProps) {
  const [{ restaurantSlug }, query] = await Promise.all([params, searchParams]);
  const supabase = await createSupabaseServerClient();

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select(
      `
      id,
      name,
      slug,
      description,
      description_en,
      description_ar,
      logo_url,
      cover_image_url,
      cover_url,
      primary_color,
      default_language,
      phone,
      whatsapp_phone,
      whatsapp_number,
      email,
      contact_phone,
      contact_whatsapp,
      contact_email,
      website
    `
    )
    .eq("slug", restaurantSlug)
    .maybeSingle();

  if (restaurantError) {
    console.error("[microsite] restaurant load error", restaurantError);
  }

  if (!restaurant) {
    notFound();
  }

  const { data: branchesData, error: branchesError } = await supabase
    .from("branches")
    .select("id, name, slug, address, is_active, opening_hours, created_at")
    .eq("restaurant_id", restaurant.id)
    .order("name", { ascending: true });

  if (branchesError) {
    console.error("[microsite] branches load error", branchesError);
  }

  type OpeningHoursRow = Record<
    | "sunday"
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday",
    {
      open: string | null;
      close: string | null;
      closed: boolean;
    }
  >;

  const branches =
    branchesData?.map((branch) => ({
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      address: branch.address,
      isActive: branch.is_active !== false,
      openingHours: (branch.opening_hours as OpeningHoursRow | null) ?? null,
    })) ?? [];

  const activeBranch =
    branches.find((branch) => branch.isActive) ?? branches[0] ?? null;

  const urlLanguage = resolveLanguageParam(query?.lang);
  const initialLanguage = determineInitialLanguage(
    restaurant.default_language,
    urlLanguage
  );

  const profileMeta = parseRestaurantProfileMeta(restaurant.description);

  return (
    <MicrositeClient
      restaurant={{
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        description_en: restaurant.description_en,
        description_ar: restaurant.description_ar,
        logo_url: restaurant.logo_url,
        cover_image_url: restaurant.cover_image_url ?? restaurant.cover_url,
      primary_color: restaurant.primary_color,
      default_language: restaurant.default_language,
      contact: {
        phone: restaurant.contact_phone ?? restaurant.phone,
        whatsapp:
            restaurant.contact_whatsapp ??
            restaurant.whatsapp_phone ??
            restaurant.whatsapp_number,
          email: restaurant.contact_email ?? restaurant.email,
          website: restaurant.website,
        },
        socials: profileMeta.socials ?? {},
        phoneCountryCode: profileMeta.phoneCountryCode ?? "+961",
        whatsappCountryCode: profileMeta.whatsappCountryCode ?? "+961",
      }}
      branches={branches}
      primaryBranch={activeBranch}
      initialLanguage={initialLanguage}
    />
  );
}
