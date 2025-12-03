import { unstable_noStore as noStore } from "next/cache";
import { notFound } from "next/navigation";
import Image from "next/image";
import { createSupabaseServerClient } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = {
  params: Promise<{ restaurantSlug: string }>;
};

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  primary_color: string | null;
};

type CategoryRecord = {
  id: string;
  name_en: string | null;
  description_en: string | null;
  display_order: number | null;
};

type ItemRecord = {
  id: string;
  category_id: string;
  name_en: string | null;
  description_en: string | null;
  price: number | string | null;
  secondary_price: number | string | null;
  primary_currency: string | null;
  secondary_currency: string | null;
  image_url: string | null;
  is_new: boolean | null;
  is_popular: boolean | null;
  is_spicy: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  display_order: number | null;
};

const formatPrice = (
  value: number | string | null | undefined,
  currency?: string | null
) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency && currency.trim() ? currency : "USD",
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return numeric.toFixed(2);
  }
};

export default async function PublicMenuPage({ params }: PageProps) {
  const { restaurantSlug } = await params;
  noStore();
  const supabase = await createSupabaseServerClient();

  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("id, name, slug, description, logo_url, primary_color")
    .eq("slug", restaurantSlug)
    .maybeSingle();

  if (restaurantError) {
    console.error("[PUBLIC MENU] restaurant error", restaurantError);
  }

  if (!restaurant) {
    notFound();
  }

  const [{ data: categoriesData, error: categoriesError }, { data: itemsData, error: itemsError }] =
    await Promise.all([
      supabase
        .from("categories")
        .select("id, name_en, description_en, display_order")
    .eq("restaurant_id", restaurant.id)
        .eq("is_visible", true)
        .order("display_order", { ascending: true }),
      supabase
        .from("items")
        .select(
          "id, category_id, name_en, description_en, price, secondary_price, primary_currency, secondary_currency, image_url, is_new, is_popular, is_spicy, is_vegetarian, is_vegan, is_gluten_free, display_order"
        )
        .eq("restaurant_id", restaurant.id)
        .eq("is_visible", true)
        .eq("is_available", true)
        .order("display_order", { ascending: true }),
    ]);

  if (categoriesError) {
    console.error("[PUBLIC MENU] categories error", categoriesError);
  }

  if (itemsError) {
    console.error("[PUBLIC MENU] items error", itemsError);
  }

  const itemsByCategory = new Map<string, ItemRecord[]>();
  (itemsData ?? []).forEach((item) => {
    const list = itemsByCategory.get(item.category_id) ?? [];
    list.push(item);
    itemsByCategory.set(item.category_id, list);
  });

  const categories = (categoriesData ?? [])
    .map((category) => ({
      ...category,
      items: itemsByCategory.get(category.id) ?? [],
    }))
    .filter((category) => category.items.length > 0);

  const accentColor = restaurant.primary_color?.trim() || "#0f172a";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header
        className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 pb-12 pt-16 text-white"
        style={{ backgroundColor: accentColor }}
      >
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-4 px-6 text-center">
          {restaurant.logo_url && (
            <div className="relative h-20 w-20 overflow-hidden rounded-full border border-white/30 bg-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">
              LoyalBite Menu
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{restaurant.name}</h1>
            {restaurant.description && (
              <p className="mt-3 text-white/80">{restaurant.description}</p>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
        {categories.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center text-base text-slate-600 shadow-sm">
            This menu is being updated. Please check back soon.
          </div>
        ) : (
          <div className="space-y-10">
            {categories.map((category) => (
              <section key={category.id} className="scroll-mt-16" id={category.id}>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">
                      {category.name_en || "Untitled"}
                    </h2>
                    {category.description_en && (
                      <p className="text-sm text-slate-600">
                        {category.description_en}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid gap-4">
                  {category.items.map((item) => {
                    const primaryPrice = formatPrice(
                      item.price,
                      item.primary_currency
                    );
                    const secondaryPrice = formatPrice(
                      item.secondary_price,
                      item.secondary_currency
                    );

                    return (
                      <article
                        key={item.id}
                        className="flex gap-4 rounded-3xl border bg-white/90 p-4 shadow-sm transition hover:shadow-md sm:gap-6 sm:p-5"
                      >
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-24 sm:w-24">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={item.name_en ?? ""}
                              fill
                              sizes="96px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                              No image
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="space-y-1">
                              <h3 className="text-lg font-semibold">
                                {item.name_en}
                              </h3>
                              {item.description_en && (
                                <p className="text-sm text-slate-600">
                                  {item.description_en}
                                </p>
                              )}
                            </div>
                            <div className="text-right text-base font-semibold text-slate-900">
                              {primaryPrice ?? "—"}
                              {secondaryPrice && (
                                <p className="text-xs font-normal text-slate-500">
                                  {secondaryPrice}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                            {item.is_new && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-orange-700">
                                New
                              </span>
                            )}
                            {item.is_popular && (
                              <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-yellow-700">
                                Popular
                              </span>
                            )}
                            {item.is_spicy && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-red-700">
                                Spicy
                              </span>
                            )}
                            {item.is_vegetarian && (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-green-700">
                                Vegetarian
                              </span>
                            )}
                            {item.is_vegan && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                                Vegan
                              </span>
                            )}
                            {item.is_gluten_free && (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-blue-700">
                                Gluten-Free
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
