"use client";

import { useCallback, useEffect, useMemo } from "react";
import { SupportedLanguage } from "@/lib/language";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { cn } from "@/lib/utils";

type PrintItem = {
  id: string;
  category_id: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price: number | string | null;
  secondary_price: number | string | null;
  primary_currency: string | null;
  secondary_currency: string | null;
  is_new: boolean | null;
  is_popular: boolean | null;
  is_spicy: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
};

type PrintCategory = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  is_offers?: boolean | null;
  is_visible?: boolean | null;
  items: PrintItem[];
};

type PrintMenuClientProps = {
  restaurant: {
    id: string;
    name: string;
    logo_url: string | null;
    description_en: string | null;
    description_ar: string | null;
  };
  branch: {
    id: string;
    name: string;
    address: string | null;
  };
  categories: PrintCategory[];
  language: SupportedLanguage;
};

const PRINT_TEXT = {
  en: {
    printButton: "Print menu",
    hint: 'Use your browser\'s "Save as PDF" to download a copy.',
    offersLabel: "TODAY'S OFFERS",
    tags: {
      is_new: "New",
      is_popular: "Popular",
      is_spicy: "Spicy",
      is_vegetarian: "Vegetarian",
      is_vegan: "Vegan",
      is_gluten_free: "Gluten-free",
    },
  },
  ar: {
    printButton: "طباعة القائمة",
    hint: "استخدم «حفظ بتنسيق PDF» في المتصفح لتنزيل نسخة.",
    offersLabel: "عروض اليوم",
    tags: {
      is_new: "جديد",
      is_popular: "الأكثر طلبًا",
      is_spicy: "حار",
      is_vegetarian: "نباتي",
      is_vegan: "نباتي تمامًا",
      is_gluten_free: "خالٍ من الغلوتين",
    },
  },
} as const;

const formatPrice = (
  value: number | string | null | undefined,
  currency: string | null | undefined,
  language: SupportedLanguage
) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  try {
    return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en", {
      style: "currency",
      currency: currency && currency.trim() ? currency : "USD",
      maximumFractionDigits: 2,
    }).format(numeric);
  } catch {
    return numeric.toFixed(2);
  }
};

export function PrintMenuClient({
  restaurant,
  branch,
  categories,
  language,
}: PrintMenuClientProps) {
  useEffect(() => {
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: branch.id,
      eventType: "menu_print_view",
      language,
    });
  }, [restaurant.id, branch.id, language]);

  const labels = PRINT_TEXT[language];

  const handlePrint = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const sortedCategories = useMemo(() => {
    const offers: PrintCategory[] = [];
    const regular: PrintCategory[] = [];
    categories.forEach((category) => {
      const isVisible = category.is_visible ?? true;
      if (!isVisible || category.items.length === 0) return;
      if (category.is_offers) {
        offers.push(category);
      } else {
        regular.push(category);
      }
    });
    return [...offers, ...regular];
  }, [categories]);

  const localizedCategories = useMemo(() => {
    return sortedCategories.map((category) => {
      const localizedName =
        language === "ar"
          ? category.name_ar?.trim() || category.name_en?.trim() || "-"
          : category.name_en?.trim() || category.name_ar?.trim() || "-";
      const localizedDescription =
        language === "ar"
          ? category.description_ar?.trim() || category.description_en?.trim() || ""
          : category.description_en?.trim() || category.description_ar?.trim() || "";
      return {
        ...category,
        localizedName,
        localizedDescription,
      };
    });
  }, [language, sortedCategories]);

  const getItemName = (item: PrintItem) =>
    language === "ar"
      ? item.name_ar?.trim() || item.name_en?.trim() || ""
      : item.name_en?.trim() || item.name_ar?.trim() || "";

  const getItemDescription = (item: PrintItem) =>
    language === "ar"
      ? item.description_ar?.trim() || item.description_en?.trim() || ""
      : item.description_en?.trim() || item.description_ar?.trim() || "";

  const getTags = (item: PrintItem) => {
    const tags: string[] = [];
    (Object.keys(labels.tags) as Array<keyof typeof labels.tags>).forEach(
      (key) => {
        if (item[key]) {
          tags.push(labels.tags[key]);
        }
      }
    );
    return tags;
  };

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-white px-4 py-8 text-slate-900 sm:px-8"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body {
                background: #ffffff;
              }
              .print-toolbar {
                display: none !important;
              }
              .print-page {
                padding: 0 !important;
              }
            }
          `,
        }}
      />
      <div className="print-page mx-auto max-w-3xl">
        <div className="print-toolbar mb-6 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handlePrint}
            className="rounded-full bg-slate-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            {labels.printButton}
          </button>
          <p className="text-sm text-slate-500">{labels.hint}</p>
        </div>

        <header className="flex flex-col items-center gap-2 text-center">
          {restaurant.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={restaurant.logo_url}
              alt={restaurant.name}
              className="h-16 w-16 rounded-full border border-slate-200 object-cover"
            />
          )}
          <h1 className="text-3xl font-semibold">{restaurant.name}</h1>
          <p className="text-sm text-slate-600">
            {branch.name}
            {branch.address ? ` • ${branch.address}` : ""}
          </p>
          {language === "ar"
            ? restaurant.description_ar && (
                <p className="text-sm text-slate-500">{restaurant.description_ar}</p>
              )
            : restaurant.description_en && (
                <p className="text-sm text-slate-500">{restaurant.description_en}</p>
              )}
        </header>

        <main className="mt-10 space-y-8">
          {localizedCategories.map((category) => (
            <section key={category.id} className="space-y-3">
              <div>
                {category.is_offers && (
                  <p
                    className={cn(
                      "text-amber-600",
                      language === "en"
                        ? "text-xs uppercase tracking-[0.25em]"
                        : "text-sm font-semibold"
                    )}
                  >
                    {labels.offersLabel}
                  </p>
                )}
                <h2 className="text-2xl font-semibold">{category.localizedName}</h2>
                {category.localizedDescription && (
                  <p className="text-sm text-slate-600">{category.localizedDescription}</p>
                )}
              </div>

              <div className="space-y-4">
                {category.items.map((item) => {
                  const primaryPrice = formatPrice(
                    item.price,
                    item.primary_currency,
                    language
                  );
                  const secondaryPrice = formatPrice(
                    item.secondary_price,
                    item.secondary_currency,
                    language
                  );
                  const tags = getTags(item);

                  return (
                    <article
                      key={item.id}
                      className="border-b border-slate-200 pb-3 last:border-none"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-lg font-semibold">
                            {getItemName(item)}
                          </p>
                          {getItemDescription(item) && (
                            <p className="text-sm text-slate-600">
                              {getItemDescription(item)}
                            </p>
                          )}
                          {tags.length > 0 && (
                            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                              {tags.join(" • ")}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold">
                            {primaryPrice ?? "--"}
                          </p>
                          {secondaryPrice && (
                            <p className="text-xs text-slate-500">{secondaryPrice}</p>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </main>
      </div>
    </div>
  );
}
