import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { MenuClient } from "./menu-client";
import { determineInitialLanguage, resolveLanguageParam } from "@/lib/language";
import { loadPublicMenuData } from "@/lib/menu/loaders";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{
    restaurantSlug: string;
    branchSlug: string;
  }>;
  searchParams: Promise<{
    lang?: string | string[];
  }>;
};

export default async function BranchPublicMenuPage({
  params,
  searchParams,
}: PageProps) {
  const [{ restaurantSlug, branchSlug }, query] = await Promise.all([
    params,
    searchParams,
  ]);
  noStore();
  const supabase = await createSupabaseServerClient();
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("lb_session_id")?.value ?? null;

  const menuData = await loadPublicMenuData({
    supabase,
    restaurantSlug,
    branchSlug,
    sessionId,
  });

  if (!menuData) {
    notFound();
  }

  const urlLanguage = resolveLanguageParam(query?.lang);
  const initialLanguage = determineInitialLanguage(
    menuData.restaurant.default_language,
    urlLanguage
  );

  return (
    <MenuClient
      restaurant={{
        ...menuData.restaurant,
      }}
      branch={{
        ...menuData.branch,
      }}
      categories={menuData.categories}
      accentColor={menuData.accentColor}
      initialLanguage={initialLanguage}
      fromSnapshot={menuData.fromSnapshot}
      snapshotId={menuData.snapshotId}
    />
  );
}
