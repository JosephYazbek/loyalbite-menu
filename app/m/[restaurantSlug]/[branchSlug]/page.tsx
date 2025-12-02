import { notFound } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { MenuExperience } from "@/components/menu-experience"
import {
  MenuBranch,
  MenuCategory,
  MenuLanguage,
  MenuRestaurant,
} from "@/lib/menu-types"
import { createSupabaseServiceRoleClient } from "@/lib/supabaseService"

type PageProps = {
  params: {
    restaurantSlug: string
    branchSlug: string
  }
  searchParams: {
    lang?: string
  }
}

type CategoryRecord = {
  id: string
  name_en: string | null
  name_ar?: string | null
  description_en?: string | null
  description_ar?: string | null
  is_visible?: boolean | null
  is_offers?: boolean | null
  items?: Array<ItemRecord> | null
}

type ItemRecord = {
  id: string
  name_en: string | null
  name_ar?: string | null
  description_en?: string | null
  description_ar?: string | null
  price: number | string | null
  secondary_price?: number | string | null
  primary_currency?: string | null
  secondary_currency?: string | null
  image_url?: string | null
  is_new?: boolean | null
  is_popular?: boolean | null
  is_spicy?: boolean | null
  is_vegetarian?: boolean | null
  is_vegan?: boolean | null
  is_gluten_free?: boolean | null
  is_available?: boolean | null
}

export const revalidate = 0

export default async function BranchMenuPage({ params, searchParams }: PageProps) {
  noStore()
  const supabase = createSupabaseServiceRoleClient()

  // 1️⃣ Fetch restaurant
  const { data: restaurantRecord } = await supabase
    .from("restaurants")
    .select(
      "id, name, slug, description, logo_url, phone, whatsapp_number, email, primary_color, theme, default_language"
    )
    .eq("slug", params.restaurantSlug)
    .single()

  if (!restaurantRecord) {
    notFound()
  }

  // 2️⃣ Fetch branch
  const { data: branchRecord } = await supabase
    .from("branches")
    .select("id, name, slug, address, phone, whatsapp_number")
    .eq("restaurant_id", restaurantRecord.id)
    .eq("slug", params.branchSlug)
    .single()

  if (!branchRecord) {
    notFound()
  }

  // 3️⃣ Fetch categories + items
  const { data: categoriesData } = await supabase
    .from("categories")
    .select(
      `
        id,
        name_en,
        name_ar,
        description_en,
        description_ar,
        display_order,
        is_visible,
        is_offers,
        items (
          id,
          name_en,
          name_ar,
          description_en,
          description_ar,
          price,
          secondary_price,
          primary_currency,
          secondary_currency,
          image_url,
          is_new,
          is_popular,
          is_spicy,
          is_vegetarian,
          is_vegan,
          is_gluten_free,
          is_available,
          display_order
        )
      `
    )
    .eq("restaurant_id", restaurantRecord.id)
    .order("display_order", { ascending: true })
    .order("display_order", { foreignTable: "items", ascending: true })

  // 4️⃣ Format restaurant for UI
  const menuRestaurant: MenuRestaurant = {
    id: restaurantRecord.id,
    name: restaurantRecord.name,
    slug: restaurantRecord.slug,
    description: restaurantRecord.description,
    logoUrl: restaurantRecord.logo_url,
    theme:
      restaurantRecord.theme === "dark" || restaurantRecord.theme === "light"
        ? restaurantRecord.theme
        : "light",
    defaultLanguage:
      restaurantRecord.default_language === "ar"
        ? "ar"
        : restaurantRecord.default_language === "both"
        ? "both"
        : "en",
    contact: {
      phone: restaurantRecord.phone,
      whatsapp: restaurantRecord.whatsapp_number,
      email: restaurantRecord.email,
    },
  }

  // 5️⃣ Format branch for UI
  const menuBranch: MenuBranch = {
    id: branchRecord.id,
    name: branchRecord.name,
    slug: branchRecord.slug,
    address: branchRecord.address,
    phone: branchRecord.phone,
    whatsapp: branchRecord.whatsapp_number,
  }

  // 6️⃣ Format categories & items
  const menuCategories: MenuCategory[] =
    categoriesData?.map((category: CategoryRecord) => ({
      id: category.id,
      name: {
        en: category.name_en ?? "",
        ar: category.name_ar ?? "",
      },
      description: {
        en: category.description_en ?? "",
        ar: category.description_ar ?? "",
      },
      isVisible: category.is_visible ?? true,
      isOffers: category.is_offers ?? false,
      items:
        category.items?.map((item) => ({
          id: item.id,
          name: {
            en: item.name_en ?? "",
            ar: item.name_ar ?? "",
          },
          description: {
            en: item.description_en ?? "",
            ar: item.description_ar ?? "",
          },
          imageUrl: item.image_url ?? null,
          price: {
            value: Number(item.price ?? 0),
            currency: item.primary_currency ?? "USD",
          },
          secondaryPrice: item.secondary_price
            ? {
                value: Number(item.secondary_price),
                currency: item.secondary_currency ?? "LBP",
              }
            : null,
          tags: {
            isNew: item.is_new ?? false,
            isPopular: item.is_popular ?? false,
            isSpicy: item.is_spicy ?? false,
            isVegetarian: item.is_vegetarian ?? false,
            isVegan: item.is_vegan ?? false,
            isGlutenFree: item.is_gluten_free ?? false,
          },
          isAvailable: item.is_available ?? true,
        })) ?? [],
    })) ?? []

  // 7️⃣ Determine language
  const availableLanguages: MenuLanguage[] =
    menuRestaurant.defaultLanguage === "both"
      ? ["en", "ar"]
      : [menuRestaurant.defaultLanguage === "ar" ? "ar" : "en"]

  const fallbackLanguage = availableLanguages[0]
  const requestedLanguage = searchParams.lang
  const initialLanguage = availableLanguages.includes(
    requestedLanguage as MenuLanguage
  )
    ? (requestedLanguage as MenuLanguage)
    : fallbackLanguage

  // 8️⃣ UI accent color
  const accentColor = restaurantRecord.primary_color?.trim() || "#f97316"

  return (
    <MenuExperience
      restaurant={menuRestaurant}
      branch={menuBranch}
      categories={menuCategories}
      initialLanguage={initialLanguage}
      availableLanguages={availableLanguages}
      accentColor={accentColor}
    />
  )
}
