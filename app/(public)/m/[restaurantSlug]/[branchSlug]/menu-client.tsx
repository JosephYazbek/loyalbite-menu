"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { JSX, KeyboardEvent as ReactKeyboardEvent } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Heart, Search, Star, X } from "lucide-react";
import { getAnalyticsSessionId, logAnalyticsEvent } from "@/lib/analytics-client";
import { cn } from "@/lib/utils";
import { SupportedLanguage } from "@/lib/language";
import { WhatsAppLogo } from "@/components/whatsapp-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MenuCategory, MenuItem } from "@/lib/menu/types";

type MenuLanguage = SupportedLanguage;

type ItemRecord = MenuItem;

type CategoryWithItems = MenuCategory;

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
  fromSnapshot?: boolean;
  snapshotId?: string | null;
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

const ALLERGEN_LABELS: Record<
  | "contains_dairy"
  | "contains_nuts"
  | "contains_eggs"
  | "contains_shellfish"
  | "contains_soy"
  | "contains_sesame",
  string
> = {
  contains_dairy: "Dairy",
  contains_nuts: "Nuts",
  contains_eggs: "Eggs",
  contains_shellfish: "Shellfish",
  contains_soy: "Soy",
  contains_sesame: "Sesame",
};

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

const sortItemsByPriority = (a: ItemRecord, b: ItemRecord) => {
  if (a.is_featured && !b.is_featured) return -1;
  if (b.is_featured && !a.is_featured) return 1;
  const aScore =
    a.recommendation_score !== null && a.recommendation_score !== undefined
      ? Number(a.recommendation_score)
      : -Infinity;
  const bScore =
    b.recommendation_score !== null && b.recommendation_score !== undefined
      ? Number(b.recommendation_score)
      : -Infinity;
  if (bScore !== aScore) return bScore - aScore;
  return (a.display_order ?? 0) - (b.display_order ?? 0);
};

export function MenuClient({
  restaurant,
  branch,
  categories,
  accentColor,
  initialLanguage,
  fromSnapshot: _fromSnapshot = false,
  snapshotId: _snapshotId = null,
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
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [hideAllergens, setHideAllergens] = useState({
    dairy: false,
    nuts: false,
    eggs: false,
    shellfish: false,
    soy: false,
    sesame: false,
  });
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [hasCustomizationsOnly, setHasCustomizationsOnly] = useState(false);
  const [activeItem, setActiveItem] = useState<ItemRecord | null>(null);
  const [modifierSelections, setModifierSelections] = useState<Record<string, Set<string>>>({});
  const [fromSnapshot] = useState(_fromSnapshot);
  const [snapshotNoticeVisible, setSnapshotNoticeVisible] = useState(_fromSnapshot);

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
    const initialFavorites = new Set<string>();
    categories.forEach((cat) =>
      cat.items.forEach((item) => {
        if (item.favorite) initialFavorites.add(item.id);
      })
    );
    setFavoriteIds(initialFavorites);
  }, [categories]);

  useEffect(() => {
    if (fromSnapshot) {
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        eventType: "menu_cached_load",
        language: languageRef.current,
      });
    }
  }, [fromSnapshot, restaurant.id, branch.id]);

  useEffect(() => {
    if (activeItem?.modifiers?.length) {
      activeItem.modifiers.forEach((mod) =>
        logAnalyticsEvent({
          restaurantId: restaurant.id,
          branchId: branch.id,
          categoryId: activeItem.category_id,
          itemId: activeItem.id,
          eventType: "modifier_group_open",
          language: languageRef.current,
          metadata: { modifierId: mod.id },
        })
      );
    }
  }, [activeItem, restaurant.id, branch.id]);

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
        metadata: { search_term: trimmed },
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
    setHideAllergens({
      dairy: false,
      nuts: false,
      eggs: false,
      shellfish: false,
      soy: false,
      sesame: false,
    });
    setShowFeaturedOnly(false);
    setFavoritesOnly(false);
    setHasCustomizationsOnly(false);
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
    showFeaturedOnly ||
    favoritesOnly ||
    hasCustomizationsOnly ||
    Object.values(hideAllergens).some(Boolean) ||
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
        if (offersOnly && !category.is_offers) return null;
        if (categoryFilter && category.id !== categoryFilter) return null;

        const filteredItems = category.items
          .map((item) => {
            if (item.is_visible === false) return null;
            if (availableOnly && item.is_available === false) return null;
            if (showFeaturedOnly && !item.is_featured) return null;
            if (favoritesOnly && !favoriteIds.has(item.id)) return null;
            if (hasCustomizationsOnly && !(item.modifiers?.length)) return null;

            if (selectedPills.length) {
              const matches = selectedPills.some((pill) => {
                if (pill === "offers") return Boolean(category.is_offers);
                const field = pill as Exclude<FilterPillKey, "offers">;
                return Boolean(item[field as keyof ItemRecord]);
              });
              if (!matches) return null;
            }

            if (caloriesLimit !== null) {
              const numericCalories =
                typeof item.calories === "number"
                  ? item.calories
                  : Number(item.calories);
              if (Number.isFinite(numericCalories) && numericCalories > caloriesLimit) {
                return null;
              }
            }

            const allergenBlocked =
              (hideAllergens.dairy && item.contains_dairy) ||
              (hideAllergens.nuts && item.contains_nuts) ||
              (hideAllergens.eggs && item.contains_eggs) ||
              (hideAllergens.shellfish && item.contains_shellfish) ||
              (hideAllergens.soy && item.contains_soy) ||
              (hideAllergens.sesame && item.contains_sesame);
            if (allergenBlocked) return null;

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
              const modifierText = normalizeForSearch(
                (item.modifiers ?? [])
                  .flatMap((mod) => mod.options?.map((opt) => opt.name) ?? [])
                  .join(" ")
              );

              const matchesSearch =
                normalizedName.includes(normalizedSearch) ||
                normalizedDescription.includes(normalizedSearch) ||
                normalizedCategoryName.includes(normalizedSearch) ||
                modifierText.includes(normalizedSearch);
              if (!matchesSearch) return null;
            }

            return item;
          })
          .filter((item): item is ItemRecord => Boolean(item))
          .sort(sortItemsByPriority);

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
    hideAllergens,
    showFeaturedOnly,
    favoritesOnly,
    favoriteIds,
    hasCustomizationsOnly,
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

  const renderAllergenPills = (item: ItemRecord) => {
    const entries = Object.entries(ALLERGEN_LABELS).filter(
      ([key]) => (item as any)[key]
    );
    if (!entries.length) return null;
    return (
      <div className="flex flex-wrap gap-1">
        {entries.map(([key, label]) => (
          <span
            key={key}
            className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800"
          >
            ⚠ {label}
          </span>
        ))}
      </div>
    );
  };

  const toggleFavorite = async (item: ItemRecord) => {
    const sessionId = getAnalyticsSessionId();
    if (!sessionId) return;
    const isFav = favoriteIds.has(item.id);
    const next = new Set(favoriteIds);
    if (isFav) {
      next.delete(item.id);
      setFavoriteIds(next);
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        categoryId: item.category_id,
        itemId: item.id,
        eventType: "menu_unfavorite",
        language: languageRef.current,
      });
      await fetch("/api/public/favorites/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, itemId: item.id }),
      });
    } else {
      next.add(item.id);
      setFavoriteIds(next);
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        categoryId: item.category_id,
        itemId: item.id,
        eventType: "menu_favorite",
        language: languageRef.current,
      });
      await fetch("/api/public/favorites/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, itemId: item.id }),
      });
    }
  };

  const openItemModal = (item: ItemRecord, categoryId: string) => {
    handleItemInteraction(item.id, categoryId);
    setActiveItem(item);
    setModifierSelections({});
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: branch.id,
      categoryId,
      itemId: item.id,
      eventType: "item_modal_open",
      language: languageRef.current,
    });
    if (item.is_featured) {
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        categoryId,
        itemId: item.id,
        eventType: "item_featured_view",
        language: languageRef.current,
      });
    }
  };

  const closeItemModal = (shouldLog: boolean) => {
    if (shouldLog && activeItem) {
      logAnalyticsEvent({
        restaurantId: restaurant.id,
        branchId: branch.id,
        categoryId: activeItem.category_id,
        itemId: activeItem.id,
        eventType: "item_modal_close",
        language: languageRef.current,
      });
    }
    setActiveItem(null);
    setModifierSelections({});
  };

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
    const isFavorite = favoriteIds.has(item.id);

    return (
      <article
        key={item.id}
        onClick={() => openItemModal(item, categoryId)}
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
          {item.is_featured && (
            <div className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-amber-600 shadow">
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
              Featured
            </div>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(item);
            }}
            className="absolute right-2 top-2 rounded-full bg-white/90 p-1 text-rose-600 shadow hover:bg-white"
            aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
          >
            <Heart
              className={cn("h-4 w-4", isFavorite ? "fill-rose-600" : "")}
            />
          </button>
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
              {renderAllergenPills(item)}
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
      {snapshotNoticeVisible && (
        <div className="bg-amber-100 px-4 py-3 text-sm text-amber-800 shadow">
          You are viewing an offline cached menu. Some updates may not be shown.
          <button
            type="button"
            className="ml-3 text-amber-700 underline"
            onClick={() => setSnapshotNoticeVisible(false)}
          >
            Dismiss
          </button>
        </div>
      )}
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
            {offersOnly && !sortedCategories.some((cat) => cat.is_offers) && (
              <p className="text-xs text-amber-700">
                Mark at least one category as an Offer in Menu &gt; Categories to show results here.
              </p>
            )}
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-3">
                <p className="text-sm font-medium text-foreground">Allergens</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { key: "dairy", label: "Hide dairy" },
                    { key: "nuts", label: "Hide nuts" },
                    { key: "eggs", label: "Hide eggs" },
                    { key: "shellfish", label: "Hide shellfish" },
                    { key: "soy", label: "Hide soy" },
                    { key: "sesame", label: "Hide sesame" },
                  ].map((a) => (
                    <label
                      key={a.key}
                      className="flex items-center gap-2 rounded-lg border border-border/60 px-2 py-1.5"
                    >
                      <input
                        type="checkbox"
                        checked={(hideAllergens as any)[a.key]}
                        onChange={() => {
                          setHideAllergens((prev) => {
                            const next = { ...prev, [a.key]: !prev[a.key as keyof typeof prev] };
                            logAnalyticsEvent({
                              restaurantId: restaurant.id,
                              branchId: branch.id,
                              eventType: "allergen_filter_apply",
                              language: languageRef.current,
                              metadata: next,
                            });
                            return next;
                          });
                        }}
                      />
                      <span>{a.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-border bg-background/60 p-3">
                <p className="text-sm font-medium text-foreground">Other filters</p>
                <div className="flex flex-col gap-2 text-sm">
                  <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <span>Featured only</span>
                    <Switch
                      checked={showFeaturedOnly}
                      onCheckedChange={(checked) => {
                        setShowFeaturedOnly(checked);
                        logAnalyticsEvent({
                          restaurantId: restaurant.id,
                          branchId: branch.id,
                          eventType: "featured_filter_apply",
                          language: languageRef.current,
                        });
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <span>My favorites</span>
                    <Switch
                      checked={favoritesOnly}
                      onCheckedChange={(checked) => {
                        setFavoritesOnly(checked);
                        logAnalyticsEvent({
                          restaurantId: restaurant.id,
                          branchId: branch.id,
                          eventType: "favorites_filter_apply",
                          language: languageRef.current,
                        });
                      }}
                    />
                  </label>
                  <label className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                    <span>Has customizations</span>
                    <Switch
                      checked={hasCustomizationsOnly}
                      onCheckedChange={(checked) => {
                        setHasCustomizationsOnly(checked);
                        logAnalyticsEvent({
                          restaurantId: restaurant.id,
                          branchId: branch.id,
                          eventType: "filter_toggle",
                          language: languageRef.current,
                          metadata: { hasCustomizationsOnly: checked },
                        });
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
          )}
        </section>
        {displayCategories.length === 0 ? (
          <div className="space-y-4 rounded-2xl border border-dashed bg-white/70 p-10 text-center text-base text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-300">
            <p>{emptyMessage}</p>
            <div className="flex flex-wrap justify-center gap-2 text-sm">
              <Button variant="outline" size="sm" onClick={handleClearFilters}>
                Clear all filters
              </Button>
              <Button variant="ghost" size="sm" onClick={handleSearchClear}>
                Reset search
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-10">
            {displayCategories.map(renderCategory)}
          </div>
        )}
      </main>

      <Dialog
        open={Boolean(activeItem)}
        onOpenChange={(open) => {
          if (!open) closeItemModal(true);
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {activeItem && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>{getItemName(activeItem)}</span>
                  {activeItem.is_featured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" /> Featured
                    </span>
                  )}
                </DialogTitle>
                {getItemDescription(activeItem) && (
                  <DialogDescription>{getItemDescription(activeItem)}</DialogDescription>
                )}
              </DialogHeader>
              <div className="space-y-4">
                {activeItem.image_url && (
                  <div className="relative h-48 w-full overflow-hidden rounded-2xl">
                    <Image
                      src={activeItem.image_url}
                      alt={getItemName(activeItem)}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-lg font-semibold">
                    {formatPrice(activeItem.price, activeItem.primary_currency, language) ?? "--"}
                    {activeItem.secondary_price && (
                      <span className="ml-2 text-sm text-muted-foreground">
                        {formatPrice(
                          activeItem.secondary_price,
                          activeItem.secondary_currency,
                          language
                        )}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1">{renderAllergenPills(activeItem)}</div>
                </div>

                {activeItem.modifiers?.length ? (
                  <div className="space-y-3">
                    {activeItem.modifiers.map((mod) => {
                      const selected = modifierSelections[mod.id] ?? new Set<string>();

                      const handleToggle = (optionId: string) => {
                        setModifierSelections((prev) => {
                          const current = new Set(prev[mod.id] ?? []);
                          if (current.has(optionId)) {
                            current.delete(optionId);
                            logAnalyticsEvent({
                              restaurantId: restaurant.id,
                              branchId: branch.id,
                              categoryId: activeItem.category_id,
                              itemId: activeItem.id,
                              eventType: "modifier_option_remove",
                              language: languageRef.current,
                              metadata: { modifierId: mod.id, optionId },
                            });
                          } else {
                            current.add(optionId);
                            logAnalyticsEvent({
                              restaurantId: restaurant.id,
                              branchId: branch.id,
                              categoryId: activeItem.category_id,
                              itemId: activeItem.id,
                              eventType: "modifier_option_select",
                              language: languageRef.current,
                              metadata: { modifierId: mod.id, optionId },
                            });
                          }
                          return { ...prev, [mod.id]: current };
                        });
                      };

                      const count = selected.size;
                      const min = mod.min_choices ?? 0;
                      const max = mod.max_choices ?? mod.options.length;
                      const maxed = count >= max;

                      return (
                        <div key={mod.id} className="rounded-2xl border p-3">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{mod.name}</p>
                            <span className="text-xs text-muted-foreground">
                              Choose {min} - {max}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {mod.options.map((opt) => {
                              const active = selected.has(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => handleToggle(opt.id)}
                                  disabled={!active && maxed}
                                  className={cn(
                                    "rounded-full border px-3 py-1 text-sm transition",
                                    active
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-border bg-background hover:bg-muted",
                                    !active && maxed && "opacity-60"
                                  )}
                                >
                                  {opt.name}
                                  {opt.price != null ? ` (+${opt.price})` : ""}
                                </button>
                              );
                            })}
                          </div>
                          {count < min && (
                            <p className="mt-1 text-xs text-amber-600">
                              Please select at least {min} option{min > 1 ? "s" : ""}.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                <div className="flex justify-end">
                  <Button
                    disabled={
                      activeItem.modifiers?.some((mod) => {
                        const selCount = modifierSelections[mod.id]?.size ?? 0;
                        const min = mod.min_choices ?? 0;
                        const max = mod.max_choices ?? mod.options.length;
                        return selCount < min || selCount > max;
                      }) ?? false
                    }
                    onClick={() => {
                      closeItemModal(true);
                    }}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
        {labels.footer}
      </footer>
    </div>
  );
}
