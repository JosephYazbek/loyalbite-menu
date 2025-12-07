"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/lib/language";
import { WhatsAppLogo } from "@/components/whatsapp-logo";

type MenuLanguage = SupportedLanguage;

type ItemRecord = {
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
  image_url: string | null;
  is_new: boolean | null;
  is_popular: boolean | null;
  is_spicy: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
};

type CategoryWithItems = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  items: ItemRecord[];
};

type MenuClientProps = {
  restaurant: {
    id: string;
    name: string;
    description_en: string | null;
    description_ar: string | null;
    logo_url: string | null;
    primary_color: string | null;
    default_language: string | null;
    cover_image_url: string | null;
    phone: string | null;
    whatsappPhone: string | null;
    website: string | null;
  };
  branch: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    whatsappNumber: string | null;
  };
  categories: CategoryWithItems[];
  accentColor: string;
  initialLanguage: MenuLanguage;
};

const LANGUAGE_STORAGE_KEY = "lb_menu_lang";

const UI_TEXT = {
  en: {
    languageLabel: "Language",
    branchLabel: "Branch",
    jumpToCategory: "Jump to category",
    curatedSelection: "Curated selection",
    itemsSingle: "item",
    itemsPlural: "items",
    updatingMessage: "This menu is being updated. Please check back soon.",
    noImage: "No image",
    footer: "Powered by LoyalBite - crafted for premium dining experiences.",
    heroDescriptionFallback: "Discover our latest dishes and favorites.",
    whatsappCta: "Contact on WhatsApp",
  },
  ar: {
    languageLabel: "اللغة",
    branchLabel: "الفرع",
    jumpToCategory: "انتقل إلى الفئة",
    curatedSelection: "مختارات منسقة",
    itemsSingle: "عنصر",
    itemsPlural: "عناصر",
    updatingMessage: "يتم تحديث هذه القائمة. يرجى التحقق لاحقاً.",
    noImage: "لا توجد صورة",
    footer: "منصة LoyalBite - تجربة طعام مميزة.",
    heroDescriptionFallback: "اكتشف أحدث الأطباق وأشهر الأصناف لدينا.",
    whatsappCta: "تواصل عبر واتساب",
  },
} as const;

const TAG_LABELS = {
  en: {
    is_new: "New",
    is_popular: "Popular",
    is_spicy: "Spicy",
    is_vegetarian: "Vegetarian",
    is_vegan: "Vegan",
    is_gluten_free: "Gluten-Free",
  },
  ar: {
    is_new: "جديد",
    is_popular: "الأكثر مبيعاً",
    is_spicy: "حار",
    is_vegetarian: "نباتي",
    is_vegan: "نباتي صارم",
    is_gluten_free: "خالٍ من الغلوتين",
  },
} as const;

const TAG_STYLES: Record<keyof typeof TAG_LABELS.en, string> = {
  is_new: "bg-amber-100 text-amber-700",
  is_popular: "bg-yellow-100 text-yellow-700",
  is_spicy: "bg-red-100 text-red-700",
  is_vegetarian: "bg-green-100 text-green-700",
  is_vegan: "bg-emerald-100 text-emerald-700",
  is_gluten_free: "bg-blue-100 text-blue-700",
};

const formatPrice = (
  value: number | string | null | undefined,
  currency: string | null | undefined,
  language: MenuLanguage
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

export function MenuClient({
  restaurant,
  branch,
  categories,
  accentColor,
  initialLanguage,
}: MenuClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<MenuLanguage>(initialLanguage);
  const languageRef = useRef<MenuLanguage>(initialLanguage);
  const menuLoggedRef = useRef(false);
  const viewedCategoriesRef = useRef<Set<string>>(new Set());
  const viewedItemsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === "en" || stored === "ar") {
        setLanguage(stored);
        languageRef.current = stored;
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    languageRef.current = language;
  }, [language]);

  useEffect(() => {
    if (menuLoggedRef.current) return;
    menuLoggedRef.current = true;
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: branch.id,
      eventType: "menu_view",
      language: languageRef.current,
    });
  }, [restaurant.id, branch.id]);

  const handleLanguageChange = useCallback(
    (nextLanguage: MenuLanguage) => {
      if (nextLanguage === languageRef.current) return;
      setLanguage(nextLanguage);
      languageRef.current = nextLanguage;
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        } catch {
          // ignore
        }
      }
      if (!pathname) return;
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("lang", nextLanguage);
      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router, searchParams]
  );

  const handleCategoryClick = useCallback(
    (categoryId: string) => {
      const element = document.getElementById(`cat-${categoryId}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      if (viewedCategoriesRef.current.has(categoryId)) return;
      viewedCategoriesRef.current.add(categoryId);
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        categoryId,
        eventType: "category_view",
        language: languageRef.current,
      });
    },
    [restaurant.id, branch.id]
  );

  const handleItemInteraction = useCallback(
    (itemId: string, categoryId: string) => {
      if (viewedItemsRef.current.has(itemId)) return;
      viewedItemsRef.current.add(itemId);
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        categoryId,
        itemId,
        eventType: "item_view",
        language: languageRef.current,
      });
    },
    [restaurant.id, branch.id]
  );

  const resolvedAccent = restaurant.primary_color?.trim() || accentColor;
  const labels = UI_TEXT[language];

  const heroDescription =
    (
      language === "ar"
        ? restaurant.description_ar?.trim() || restaurant.description_en?.trim()
        : restaurant.description_en?.trim() || restaurant.description_ar?.trim()
    ) ?? labels.heroDescriptionFallback;

  const whatsappNumber = useMemo(() => {
    const raw =
      branch.whatsappNumber?.trim() ||
      restaurant.whatsappPhone?.trim() ||
      null;
    if (!raw) return null;
    const digits = raw.replace(/[^\d]/g, "");
    return digits.length ? digits : null;
  }, [branch.whatsappNumber, restaurant.whatsappPhone]);

  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}`
    : null;

  const handleWhatsAppClick = useCallback(() => {
    if (!whatsappUrl) return;
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: branch.id,
      eventType: "whatsapp_click",
      language: languageRef.current,
    });
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, [branch.id, restaurant.id, whatsappUrl]);

  const categoryLookup = useMemo(() => {
    return categories.map((category) => {
      const localizedName =
        language === "ar"
          ? category.name_ar?.trim() || category.name_en?.trim() || "—"
          : category.name_en?.trim() || category.name_ar?.trim() || "—";
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
  }, [categories, language]);

  const getItemName = (item: ItemRecord) =>
    language === "ar"
      ? item.name_ar?.trim() || item.name_en?.trim() || ""
      : item.name_en?.trim() || item.name_ar?.trim() || "";

  const getItemDescription = (item: ItemRecord) =>
    language === "ar"
      ? item.description_ar?.trim() || item.description_en?.trim() || ""
      : item.description_en?.trim() || item.description_ar?.trim() || "";

  const renderTag = (item: ItemRecord, field: keyof typeof TAG_LABELS.en) => {
    if (!item[field]) return null;
    return (
      <span
        key={field}
        className={cn(
          "rounded-full px-2 py-0.5 text-xs font-medium",
          TAG_STYLES[field]
        )}
      >
        {TAG_LABELS[language][field]}
      </span>
    );
  };

  const heroBackgroundStyles = restaurant.cover_image_url
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.9), rgba(15,23,42,0.8)), url(${restaurant.cover_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : { backgroundColor: resolvedAccent };

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      lang={language}
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <header
        className="relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 pb-12 pt-16 text-white"
        style={heroBackgroundStyles}
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
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-white/70">
              LoyalBite Menu
            </p>
            <h1 className="mt-2 text-3xl font-semibold">{restaurant.name}</h1>
            <p className="mt-1 text-sm text-white/80">
              {labels.branchLabel}: {branch.name}
            </p>
            {branch.address && (
              <p className="text-xs text-white/70">{branch.address}</p>
            )}
            {heroDescription && (
              <p className="mt-3 text-white/80">{heroDescription}</p>
            )}
          </div>

          <div
            className={cn(
              "mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center",
              language === "ar" && "sm:flex-row-reverse"
            )}
          >
            <div className="flex items-center gap-3 rounded-full border border-white/30 bg-white/10 px-4 py-2 backdrop-blur">
              <span className="text-xs uppercase tracking-[0.25em] text-white/70">
                {labels.languageLabel}
              </span>
              <div className="inline-flex rounded-full bg-white/10 p-1">
                {(["en", "ar"] as MenuLanguage[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handleLanguageChange(option)}
                    className={cn(
                      "px-3 py-1 text-xs font-semibold transition",
                      language === option
                        ? "rounded-full bg-white text-slate-900 shadow-sm"
                        : "text-white/70 hover:text-white"
                    )}
                  >
                    {option.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            {whatsappUrl ? (
              <button
                type="button"
                onClick={handleWhatsAppClick}
                // className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white text-[#25d366] shadow-sm transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                aria-label={labels.whatsappCta}
              >
                <WhatsAppLogo className="h-14 w-14" />
                <span className="sr-only">{labels.whatsappCta}</span>
              </button>
            ) : null}
          </div>
        </div>

        {categoryLookup.length > 0 && (
          <div className="mx-auto mt-8 w-full max-w-4xl px-6">
            <div className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 backdrop-blur">
              <p
                className={cn(
                  "text-white/80",
                  language === "en"
                    ? "text-xs uppercase tracking-[0.25em]"
                    : "text-sm font-semibold"
                )}
              >
                {labels.jumpToCategory}
              </p>
              <div
                className={cn(
                  "-mx-1 mt-2 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1",
                  language === "ar" && "flex-row-reverse"
                )}
              >
                {categoryLookup.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategoryClick(category.id)}
                    className="snap-start rounded-2xl border border-white/20 bg-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/60 hover:bg-white/40"
                  >
                    {category.localizedName}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {categoryLookup.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center text-base text-slate-600 shadow-sm">
            {labels.updatingMessage}
          </div>
        ) : (
          <div className="space-y-10">
            {categoryLookup.map((category) => (
              <section
                key={category.id}
                id={`cat-${category.id}`}
                className="scroll-mt-24"
              >
                <div className="flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-baseline sm:justify-between">
                  <div>
                    <p
                      className={cn(
                        "text-amber-600/80",
                        language === "en"
                          ? "text-xs uppercase tracking-[0.25em]"
                          : "text-sm font-semibold"
                      )}
                    >
                      {labels.curatedSelection}
                    </p>
                    <h2
                      className={cn(
                        "mt-1 text-2xl font-semibold text-slate-900",
                        language === "ar" && "text-right"
                      )}
                    >
                      {category.localizedName}
                    </h2>
                    {category.localizedDescription && (
                      <p
                        className={cn(
                          "text-sm text-slate-600",
                          language === "ar" && "text-right"
                        )}
                      >
                        {category.localizedDescription}
                      </p>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs uppercase tracking-[0.35em] text-slate-500",
                      language === "ar" && "tracking-normal"
                    )}
                  >
                    {category.items.length} {" "}
                    {category.items.length === 1
                      ? labels.itemsSingle
                      : labels.itemsPlural}
                  </span>
                </div>

                <div className="mt-4 grid gap-4">
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
                    const itemName = getItemName(item);
                    const itemDescription = getItemDescription(item);

                    return (
                      <article
                        key={item.id}
                        onClick={() => handleItemInteraction(item.id, category.id)}
                        className="flex cursor-pointer flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-row sm:gap-6 sm:p-5"
                      >
                        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:h-28 sm:w-28">
                          {item.image_url ? (
                            <Image
                              src={item.image_url}
                              alt={itemName}
                              fill
                              sizes="112px"
                              className="object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">
                              {labels.noImage}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <h3
                                className={cn(
                                  "text-lg font-semibold text-slate-900",
                                  language === "ar" && "text-right"
                                )}
                              >
                                {itemName}
                              </h3>
                              {itemDescription && (
                                <p
                                  className={cn(
                                    "text-sm text-slate-600",
                                    language === "ar" && "text-right"
                                  )}
                                >
                                  {itemDescription}
                                </p>
                              )}
                            </div>
                            <div
                              className={cn(
                                "text-base font-semibold text-slate-900 text-right",
                                language === "ar" && "text-left"
                              )}
                            >
                              {primaryPrice ?? "--"}
                              {secondaryPrice && (
                                <p className="text-xs font-normal text-slate-500">
                                  {secondaryPrice}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                            {renderTag(item, "is_new")}
                            {renderTag(item, "is_popular")}
                            {renderTag(item, "is_spicy")}
                            {renderTag(item, "is_vegetarian")}
                            {renderTag(item, "is_vegan")}
                            {renderTag(item, "is_gluten_free")}
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

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        {labels.footer}
      </footer>
    </div>
  );
}
