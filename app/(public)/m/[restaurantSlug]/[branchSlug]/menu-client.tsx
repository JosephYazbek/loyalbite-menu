"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/lib/language";
import { WhatsAppLogo } from "@/components/whatsapp-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
  calories: number | string | null;
  is_new: boolean | null;
  is_popular: boolean | null;
  is_spicy: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  is_available: boolean | null;
  is_visible: boolean | null;
  diet_category: string | null;
};

type CategoryWithItems = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  is_offers?: boolean | null;
  is_visible?: boolean | null;
  items: ItemRecord[];
};

type LocalizedCategory = CategoryWithItems & {
  localizedName: string;
  localizedDescription: string;
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
    filterTitle: "Find dishes fast",
    quickFilters: "Quick filters",
    searchPlaceholder: "Search dishes...",
    clearFilters: "Clear filters",
    availableToggle: "Available only",
    offersToggle: "Offers only",
    maxCaloriesLabel: "Max calories",
    maxCaloriesPlaceholder: "e.g. 600",
    dietLabel: "Category",
    dietPlaceholder: "All categories",
    itemsSingle: "item",
    itemsPlural: "items",
    updatingMessage: "This menu is being updated. Please check back soon.",
    noMatches: "No dishes match your filters. Try adjusting search or filters.",
    noImage: "No image",
    footer: "Powered by LoyalBite - crafted for premium dining experiences.",
    heroDescriptionFallback: "Discover our latest dishes and favorites.",
    whatsappCta: "Contact on WhatsApp",
  },
  ar: {
    languageLabel: "اللغة",
    branchLabel: "الفرع",
    jumpToCategory: "انتقل إلى فئة",
    filterTitle: "ابحث عن الأطباق بسرعة",
    quickFilters: "مرشحات سريعة",
    searchPlaceholder: "ابحث عن طبق...",
    clearFilters: "إعادة التصفية",
    availableToggle: "الأصناف المتاحة فقط",
    offersToggle: "العروض فقط",
    maxCaloriesLabel: "الحد الأقصى للسعرات",
    maxCaloriesPlaceholder: "مثال: 600",
    dietLabel: "الفئة",
    dietPlaceholder: "كل الفئات",
    itemsSingle: "طبق",
    itemsPlural: "أطباق",
    updatingMessage: "يتم تحديث هذه القائمة. يرجى التحقق لاحقًا.",
    noMatches: "لا توجد أطباق مطابقة. جرّب تعديل البحث أو المرشحات.",
    noImage: "لا توجد صورة",
    footer: "مدعوم من LoyalBite - صُمم لتجارب طعام فاخرة.",
    heroDescriptionFallback: "اكتشف أحدث أطباقنا والمفضلة لدينا.",
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

const FILTER_PILLS = [
  { key: "offers", label: { en: "Offers", ar: "العروض" } },
  { key: "is_new", label: { en: "New", ar: "جديد" } },
  { key: "is_popular", label: { en: "Popular", ar: "شعبي" } },
  { key: "is_spicy", label: { en: "Spicy", ar: "حار" } },
  { key: "is_vegetarian", label: { en: "Veg", ar: "نباتي" } },
  { key: "is_vegan", label: { en: "Vegan", ar: "نباتي صارم" } },
  { key: "is_gluten_free", label: { en: "Gluten-free", ar: "خالٍ من الغلوتين" } },
] as const;

type FilterPillKey = (typeof FILTER_PILLS)[number]["key"];

const normalizeForSearch = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

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
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedPills, setSelectedPills] = useState<FilterPillKey[]>([]);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [offersOnly, setOffersOnly] = useState(false);
  const [maxCalories, setMaxCalories] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const lastLoggedSearchRef = useRef("");

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

  const logFilterEvent = useCallback(() => {
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: branch.id,
      eventType: "menu_filter",
      language: languageRef.current,
    });
  }, [restaurant.id, branch.id]);

  const logSearchEvent = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      if (lastLoggedSearchRef.current === trimmed) return;
      lastLoggedSearchRef.current = trimmed;
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        eventType: "menu_search",
        language: languageRef.current,
      });
    },
    [restaurant.id, branch.id]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  useEffect(() => {
    if (!debouncedSearch) return;
    logSearchEvent(debouncedSearch);
  }, [debouncedSearch, logSearchEvent]);

  const handleSearchBlur = () => {
    if (!searchTerm.trim()) return;
    logSearchEvent(searchTerm);
  };

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      logSearchEvent(searchTerm);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedPills([]);
    setAvailableOnly(false);
    setOffersOnly(false);
    setMaxCalories("");
    setCategoryFilter("");
    lastLoggedSearchRef.current = "";
    logFilterEvent();
  };

  const handleSearchClear = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    lastLoggedSearchRef.current = "";
  };

  const handlePillToggle = (key: FilterPillKey) => {
    setSelectedPills((prev) => {
      if (prev.includes(key)) {
        return prev.filter((pill) => pill !== key);
      }
      return [...prev, key];
    });
    logFilterEvent();
  };

  const handleAvailableToggle = (next: boolean) => {
    setAvailableOnly(next);
    logFilterEvent();
  };

  const handleOffersToggle = (next: boolean) => {
    setOffersOnly(next);
    logFilterEvent();
  };

  const handleCaloriesChange = (value: string) => {
    setMaxCalories(value);
    logFilterEvent();
  };

  const handleDietChange = (value: string) => {
    setCategoryFilter(value);
    logFilterEvent();
  };

  const resolvedAccent = restaurant.primary_color?.trim() || accentColor;
  const labels = UI_TEXT[language];
  const offersLabel = language === "ar" ? "عروض اليوم" : "TODAY'S OFFERS";
  const caloriesLimit = useMemo(() => {
    if (!maxCalories.trim()) return null;
    const parsed = Number(maxCalories);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }, [maxCalories]);
  const filtersActive =
    Boolean(searchTerm.trim()) ||
    selectedPills.length > 0 ||
    availableOnly ||
    offersOnly ||
    caloriesLimit !== null ||
    Boolean(categoryFilter);

  useEffect(() => {
    if (filtersActive) {
      setFiltersOpen(true);
    }
  }, [filtersActive]);

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

  const sortedCategories = useMemo(() => {
    const offers: CategoryWithItems[] = [];
    const regular: CategoryWithItems[] = [];
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

  const localizedCategories = useMemo<LocalizedCategory[]>(() => {
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
  }, [sortedCategories, language]);

  const categoryOptions = useMemo(
    () =>
      localizedCategories.map((category) => ({
        value: category.id,
        label: category.localizedName,
      })),
    [localizedCategories]
  );

  const filteredCategories = useMemo<LocalizedCategory[]>(() => {
    const normalizedSearch = normalizeForSearch(debouncedSearch);
    const hasSearch = Boolean(normalizedSearch);
    return localizedCategories
      .map((category) => {
        if (offersOnly && !category.is_offers) {
          return null;
        }
        if (categoryFilter && category.id !== categoryFilter) {
          return null;
        }
        const filteredItems = category.items.filter((item) => {
          if (item.is_visible === false) return false;
          if (availableOnly && item.is_available === false) return false;

          if (selectedPills.length) {
            const matches = selectedPills.some((pill) => {
              if (pill === "offers") {
                return Boolean(category.is_offers);
              }
              const field = pill as Exclude<FilterPillKey, "offers">;
              return Boolean(item[field as keyof ItemRecord]);
            });
            if (!matches) {
              return false;
            }
          }

          if (caloriesLimit !== null) {
            const numericCalories =
              typeof item.calories === "number"
                ? item.calories
                : Number(item.calories);
            if (
              Number.isFinite(numericCalories) &&
              numericCalories > caloriesLimit
            ) {
              return false;
            }
          }

          if (hasSearch) {
            const nameText =
              language === "ar"
                ? item.name_ar?.trim() || item.name_en?.trim() || ""
                : item.name_en?.trim() || item.name_ar?.trim() || "";
            const descriptionText =
              language === "ar"
                ? item.description_ar?.trim() || item.description_en?.trim() || ""
                : item.description_en?.trim() || item.description_ar?.trim() || "";
            const normalizedName = normalizeForSearch(nameText);
            const normalizedDescription = normalizeForSearch(descriptionText);
            const normalizedCategoryName = normalizeForSearch(category.localizedName);
            if (
              !normalizedName.includes(normalizedSearch) &&
              !normalizedDescription.includes(normalizedSearch) &&
              !normalizedCategoryName.includes(normalizedSearch)
            ) {
              return false;
            }
          }

          return true;
        });

        if (filteredItems.length === 0) return null;
        return {
          ...category,
          items: filteredItems,
        };
      })
      .filter((category): category is LocalizedCategory => Boolean(category));
  }, [
    localizedCategories,
    offersOnly,
    availableOnly,
    selectedPills,
    caloriesLimit,
    categoryFilter,
    debouncedSearch,
    language,
  ]);

  const displayCategories = filteredCategories;
  const hasBaseItems = sortedCategories.some((category) => category.items.length > 0);
  const emptyMessage =
    hasBaseItems && filtersActive ? labels.noMatches : labels.updatingMessage;

  const getItemName = (item: ItemRecord) =>
    language === "ar"
      ? item.name_ar?.trim() || item.name_en?.trim() || ""
      : item.name_en?.trim() || item.name_ar?.trim() || "";

  const getItemDescription = (item: ItemRecord) =>
    language === "ar"
      ? item.description_ar?.trim() || item.description_en?.trim() || ""
      : item.description_en?.trim() || item.description_ar?.trim() || "";

  const renderItem = (categoryId: string, item: ItemRecord) => {
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
    const caloriesText =
      item.calories !== null && item.calories !== undefined && item.calories !== ""
        ? `${item.calories} kcal`
        : null;

    return (
      <article
        key={item.id}
        onClick={() => handleItemInteraction(item.id, categoryId)}
        className="flex cursor-pointer flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:gap-6 sm:p-5"
      >
        <div className="relative h-24 w-full shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 sm:h-28 sm:w-28">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={getItemName(item)}
              fill
              sizes="112px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400 dark:text-slate-500">
              {labels.noImage}
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3
                className={cn(
                  "text-lg font-semibold text-slate-900 dark:text-white",
                  language === "ar" && "text-right"
                )}
              >
                {getItemName(item)}
              </h3>
              {getItemDescription(item) && (
                <p
                  className={cn(
                    "text-sm text-slate-600 dark:text-slate-300",
                    language === "ar" && "text-right"
                  )}
                >
                  {getItemDescription(item)}
                </p>
              )}
            </div>
            <div
              className={cn(
                "text-base font-semibold text-slate-900 text-right dark:text-white",
                language === "ar" && "text-left"
              )}
            >
              {primaryPrice ?? "--"}
              {secondaryPrice && (
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {secondaryPrice}
                </p>
              )}
              {caloriesText && (
                <p className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {caloriesText}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
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
  };

  const renderCategory = (
    category: (typeof displayCategories)[number]
  ): JSX.Element => {
    return (
      <section
        key={category.id}
        id={`cat-${category.id}`}
        className="scroll-mt-24"
      >
        <div
          className={cn(
            "space-y-4",
            category.is_offers
              ? "rounded-3xl border border-amber-500/30 bg-amber-500/5 p-4 shadow-sm dark:bg-amber-500/10 sm:p-6"
              : ""
          )}
        >
          <div
            className={cn(
              "flex flex-col gap-2 border-b border-slate-200 pb-4 sm:flex-row sm:items-baseline sm:justify-between dark:border-slate-800",
              category.is_offers && "border-amber-500/30"
            )}
          >
            <div>
              {category.is_offers ? (
                <p
                  className={cn(
                    "text-amber-600/80",
                    language === "en"
                      ? "text-xs uppercase tracking-[0.25em]"
                      : "text-sm font-semibold"
                  )}
                >
                  {offersLabel}
                </p>
              ) : null}
              <h2
                className={cn(
                  "mt-1 text-2xl font-semibold text-slate-900 dark:text-white",
                  language === "ar" && "text-right"
                )}
              >
                {category.localizedName}
              </h2>
              {category.localizedDescription && (
                <p
                  className={cn(
                    "text-sm text-slate-600 dark:text-slate-300",
                    language === "ar" && "text-right"
                  )}
                >
                  {category.localizedDescription}
                </p>
              )}
            </div>
            <span
              className={cn(
                "text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400",
                language === "ar" && "tracking-normal"
              )}
            >
              {category.items.length}{" "}
              {category.items.length === 1
                ? labels.itemsSingle
                : labels.itemsPlural}
            </span>
          </div>

          <div className="grid gap-4">
            {category.items.map((item) => renderItem(category.id, item))}
          </div>
        </div>
      </section>
    );
  };
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
      className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100"
    >
      <header
        className="relative overflow-hidden bg-linear-to-b from-slate-900 to-slate-800 pb-12 pt-16 text-white"
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
                <WhatsAppLogo className="h-15 w-15" />
                <span className="sr-only">{labels.whatsappCta}</span>
              </button>
            ) : null}
          </div>
        </div>

        {displayCategories.length > 0 && (
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
                {displayCategories.map((category) => (
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
        <section className="mb-10">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-base font-semibold text-foreground">
              {labels.filterTitle}
            </p>
            <div className="flex items-center gap-2">
              {filtersActive && (
                <Button variant="link" size="sm" onClick={handleClearFilters}>
                  {labels.clearFilters}
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => setFiltersOpen((prev) => !prev)}
                className="whitespace-nowrap"
              >
                {filtersOpen
                  ? language === "ar"
                    ? "إخفاء المرشحات"
                    : "Hide filters"
                  : language === "ar"
                    ? "عرض المرشحات"
                    : "Show filters"}
              </Button>
            </div>
          </div>
          {filtersOpen && (
            <div className="mt-4 space-y-5 rounded-3xl border border-border bg-card/90 p-5 shadow-sm ring-1 ring-black/5 dark:bg-slate-900/70">
            <div className="relative">
              <Search
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 text-slate-400",
                  language === "ar" ? "right-4" : "left-4"
                )}
              />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={labels.searchPlaceholder}
                onBlur={handleSearchBlur}
                onKeyDown={handleSearchKeyDown}
                dir={language === "ar" ? "rtl" : "ltr"}
                className={cn(
                  "h-12 rounded-full border border-border bg-background/90 text-sm shadow-sm focus-visible:ring-2 focus-visible:ring-primary",
                  language === "ar" ? "pr-12 text-right" : "pl-12 text-left"
                )}
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={handleSearchClear}
                  className={cn(
                    "absolute top-1/2 -translate-y-1/2 rounded-full bg-white/80 p-1 text-slate-500 shadow hover:text-slate-900",
                    language === "ar" ? "left-3" : "right-3"
                  )}
                  aria-label={labels.clearFilters}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {labels.quickFilters}
              </p>
              <div
                className={cn(
                  "-mx-1 mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1",
                  language === "ar" && "flex-row-reverse"
                )}
              >
                {FILTER_PILLS.map((pill) => {
                  const active = selectedPills.includes(pill.key);
                  return (
                    <button
                      key={pill.key}
                      type="button"
                      onClick={() => handlePillToggle(pill.key)}
                      className={cn(
                        "snap-start rounded-full border px-4 py-1 text-xs font-semibold transition",
                        active
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border/70 bg-background/80 text-foreground hover:bg-muted"
                      )}
                    >
                      {pill.label[language]}
                    </button>
                  );
                })}
              </div>
            </div>
              <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/60 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {labels.availableToggle}
                </p>
                <Switch
                  checked={availableOnly}
                  onCheckedChange={handleAvailableToggle}
                />
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-border bg-background/60 px-4 py-3">
                <p className="text-sm font-medium text-foreground">
                  {labels.offersToggle}
                </p>
                <Switch
                  checked={offersOnly}
                  onCheckedChange={handleOffersToggle}
                />
              </div>
            </div>
              <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {labels.maxCaloriesLabel}
                </p>
                <Input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  dir={language === "ar" ? "rtl" : "ltr"}
                  value={maxCalories}
                  onChange={(event) => handleCaloriesChange(event.target.value)}
                  placeholder={labels.maxCaloriesPlaceholder}
                  className="mt-2"
                />
              </div>
                <div>
                <p className="text-sm font-medium text-foreground">
                  {labels.dietLabel}
                </p>
                <select
                  className="mt-2 w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm"
                  value={categoryFilter}
                  onChange={(event) =>
                    handleDietChange(event.target.value)
                  }
                  dir={language === "ar" ? "rtl" : "ltr"}
                >
                  <option value="">{labels.dietPlaceholder}</option>
                  {categoryOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
          )}
        </section>
        {displayCategories.length === 0 ? (
          <div className="rounded-2xl border border-dashed bg-white/70 p-10 text-center text-base text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            {emptyMessage}
          </div>
        ) : (
          <div className="space-y-10">
            {displayCategories.map(renderCategory)}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {labels.footer}
      </footer>
    </div>
  );
}
