"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { logAnalyticsEvent } from "@/lib/analytics-client";
import { WhatsAppLogo } from "@/components/whatsapp-logo";
import { SupportedLanguage } from "@/lib/language";
import { cn } from "@/lib/utils";
import {
  Facebook,
  Instagram,
  MapPin,
  Phone,
  Mail,
  LinkIcon,
  Youtube,
  Twitter,
  Music2,
} from "lucide-react";

type RestaurantProfileMeta = {
  socials?: Record<string, string | null>;
};

type BranchPreview = {
  id: string;
  name: string | null;
  slug: string;
  address: string | null;
  isActive: boolean;
};

type MicrositeClientProps = {
  restaurant: {
    id: string;
    name: string;
    slug: string;
    description_en: string | null;
    description_ar: string | null;
    logo_url: string | null;
    cover_image_url: string | null;
    primary_color: string | null;
    contact: {
      phone: string | null;
      whatsapp: string | null;
      email: string | null;
      website: string | null;
    };
    socials: NonNullable<RestaurantProfileMeta["socials"]>;
    phoneCountryCode: string;
    whatsappCountryCode: string;
  };
  branches: BranchPreview[];
  primaryBranch: BranchPreview | null;
  initialLanguage: SupportedLanguage;
};

const LANGUAGE_STORAGE_KEY = "lb_menu_lang";

const SOCIAL_CONFIG = [
  {
    key: "instagram" as const,
    label: "Instagram",
    icon: Instagram,
  },
  {
    key: "facebook" as const,
    label: "Facebook",
    icon: Facebook,
  },
  {
    key: "tiktok" as const,
    label: "TikTok",
    icon: Music2,
  },
  {
    key: "twitter" as const,
    label: "Twitter / X",
    icon: Twitter,
  },
  {
    key: "youtube" as const,
    label: "YouTube",
    icon: Youtube,
  },
];

const LABELS = {
  en: {
    viewMenu: "View Menu",
    contact: "Contact on WhatsApp",
    phone: "Phone",
    whatsapp: "WhatsApp",
    email: "Email",
    website: "Website",
    branchesTitle: "Branches",
    contactTitle: "Contact",
    socialsTitle: "Social",
    branchMenu: "View menu",
    missingBranch: "Menu coming soon",
  },
  ar: {
    viewMenu: "عرض القائمة",
    contact: "تواصل عبر واتساب",
    phone: "الهاتف",
    whatsapp: "واتساب",
    email: "البريد",
    website: "الموقع",
    branchesTitle: "الفروع",
    contactTitle: "تواصل",
    socialsTitle: "التواصل الاجتماعي",
    branchMenu: "عرض القائمة",
    missingBranch: "القائمة قريباً",
  },
} as const;

const sanitizeNumber = (value: string | null) =>
  value ? value.replace(/[^\d]/g, "") : null;

const addAlphaToHex = (color: string, alpha = 0.35) => {
  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hexMatch) return color;
  let hex = hexMatch[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const alphaHex = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${hex}${alphaHex}`;
};

const darkenHex = (color: string, amount = 0.3) => {
  const hexMatch = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (!hexMatch) return color;
  let hex = hexMatch[1];
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((char) => char + char)
      .join("");
  }
  const num = parseInt(hex, 16);
  const r = Math.max(0, ((num >> 16) & 0xff) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xff) * (1 - amount));
  const b = Math.max(0, (num & 0xff) * (1 - amount));
  return `rgb(${r.toFixed(0)}, ${g.toFixed(0)}, ${b.toFixed(0)})`;
};

export default function MicrositeClient({
  restaurant,
  branches,
  primaryBranch,
  initialLanguage,
}: MicrositeClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [viewLogged, setViewLogged] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (stored === "en" || stored === "ar") {
        setLanguage(stored);
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    if (viewLogged || !primaryBranch) return;
    setViewLogged(true);
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: primaryBranch.id,
      eventType: "microsite_view",
      language,
    });
  }, [language, primaryBranch, restaurant.id, viewLogged]);

  const handleLanguageChange = useCallback(
    (nextLanguage: SupportedLanguage) => {
      if (nextLanguage === language) return;
      setLanguage(nextLanguage);
      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLanguage);
        } catch {
          // ignore storage write errors
        }
      }
      if (!pathname) return;
      const params = new URLSearchParams(searchParams?.toString() ?? "");
      params.set("lang", nextLanguage);
      router.replace(
        params.size ? `${pathname}?${params.toString()}` : pathname,
        { scroll: false }
      );
    },
    [language, pathname, router, searchParams]
  );

  const labels = LABELS[language];

  const localizedDescription =
    language === "ar"
      ? restaurant.description_ar?.trim() ||
        restaurant.description_en?.trim() ||
        ""
      : restaurant.description_en?.trim() ||
        restaurant.description_ar?.trim() ||
        "";

  const whatsappDigits = sanitizeNumber(restaurant.contact.whatsapp);
  const whatsappUrl = whatsappDigits
    ? `https://wa.me/${whatsappDigits}`
    : null;

  const accent = restaurant.primary_color?.trim() || "#0f172a";
  const heroBackground = restaurant.cover_image_url
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(10,15,30,0.85), rgba(10,15,30,0.95)), url(${restaurant.cover_image_url})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }
    : {
        backgroundImage: `linear-gradient(140deg, ${accent}, ${darkenHex(
          accent,
          0.35
        )})`,
      };

  const menuUrl =
    primaryBranch &&
    `/m/${restaurant.slug}/${primaryBranch.slug}?lang=${language}`;

  const handleViewMenu = useCallback(() => {
    if (!primaryBranch || !menuUrl) return;
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: primaryBranch.id,
      eventType: "microsite_to_menu_click",
      language,
    });
    router.push(menuUrl);
  }, [language, menuUrl, primaryBranch, restaurant.id, router]);

  const handleWhatsApp = useCallback(() => {
    if (!primaryBranch || !whatsappUrl) return;
    logAnalyticsEvent({
      restaurantId: restaurant.id,
      branchId: primaryBranch.id,
      eventType: "whatsapp_click",
      language,
    });
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }, [language, primaryBranch, restaurant.id, whatsappUrl]);

  const socialEntries = useMemo(
    () =>
      SOCIAL_CONFIG.filter(
        (entry) => restaurant.socials?.[entry.key]?.trim().length
      ).map((entry) => ({
        ...entry,
        url: restaurant.socials?.[entry.key]?.trim() ?? "",
      })),
    [restaurant.socials]
  );

  return (
    <div
      dir={language === "ar" ? "rtl" : "ltr"}
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      <header className="relative overflow-hidden" style={heroBackground}>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 to-black/60" />
        <div className="relative mx-auto flex min-h-[60vh] w-full max-w-5xl flex-col items-center gap-6 px-6 py-16 text-center text-white">
          <div className="flex w-full items-center justify-between">
            <div className="rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/70">
              LoyalBite Spotlight
            </div>
            <div className="inline-flex rounded-full bg-white/10 p-1 text-xs font-semibold uppercase tracking-[0.2em]">
              {(["en", "ar"] as SupportedLanguage[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleLanguageChange(option)}
                  className={cn(
                    "rounded-full px-3 py-1 transition",
                    language === option
                      ? "bg-white text-slate-900 shadow"
                      : "text-white/70 hover:text-white"
                  )}
                >
                  {option.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-center gap-4">
            {restaurant.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={restaurant.logo_url}
                alt={restaurant.name}
                className="h-24 w-24 rounded-3xl border border-white/30 bg-white/10 object-cover shadow-2xl"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-white/30 bg-white/10 text-3xl font-semibold uppercase text-white shadow-2xl">
                {restaurant.name.slice(0, 2)}
              </div>
            )}
            <h1 className="text-4xl font-semibold">{restaurant.name}</h1>
            {localizedDescription ? (
              <p className="max-w-2xl text-sm text-white/80">
                {localizedDescription}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            {menuUrl ? (
              <button
                type="button"
                onClick={handleViewMenu}
                className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              >
                {labels.viewMenu}
              </button>
            ) : (
              <span className="text-sm text-white/70">
                {labels.missingBranch}
              </span>
            )}
            {whatsappUrl ? (
              <button
                type="button"
                onClick={handleWhatsApp}
                // className="flex h-14 w-14 items-center justify-center rounded-full border border-white/30 bg-white text-[#25d366] shadow-lg transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                aria-label={labels.contact}
              >
                <WhatsAppLogo className="h-14 w-14" />
                <span className="sr-only">{labels.contact}</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {labels.branchesTitle}
              </h2>
              <MapPin className="h-4 w-4 text-slate-400" />
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {branches.length === 0 ? (
                <p className="text-sm text-slate-500">
                  {language === "ar"
                    ? "لا توجد فروع مفعّلة بعد."
                    : "No active branches yet."}
                </p>
              ) : (
                branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-base font-semibold text-slate-900">
                      {branch.name}
                    </p>
                    {branch.address && (
                      <p className="mt-1 text-sm text-slate-600">
                        {branch.address}
                      </p>
                    )}
                    {branch.isActive ? (
                      <Link
                        href={`/m/${restaurant.slug}/${branch.slug}?lang=${language}`}
                        className="mt-3 inline-flex items-center text-xs font-semibold text-slate-900 hover:text-slate-600"
                      >
                        {labels.branchMenu}
                        <span aria-hidden="true" className="ml-1">
                          →
                        </span>
                      </Link>
                    ) : (
                      <p className="mt-3 text-xs text-slate-400">
                        {labels.missingBranch}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                {labels.contactTitle}
              </h2>
              <div className="mt-4 space-y-3 text-sm text-slate-600">
                {restaurant.contact.phone && (
                  <div className="group flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900">
                    <Phone className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" />
                    <a
                      href={`tel:${restaurant.contact.phone}`}
                      className="transition-colors group-hover:text-slate-900"
                    >
                      {restaurant.contact.phone}
                    </a>
                  </div>
                )}
                {restaurant.contact.whatsapp && (
                  <div className="group flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900">
                    <WhatsAppLogo
                      variant="mono"
                      className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600"
                    />
                    {whatsappUrl ? (
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="transition-colors group-hover:text-slate-900"
                      >
                        {restaurant.contact.whatsapp}
                      </a>
                    ) : (
                      <span className="transition-colors group-hover:text-slate-900">
                        {restaurant.contact.whatsapp}
                      </span>
                    )}
                  </div>
                )}
                {restaurant.contact.email && (
                  <div className="group flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900">
                    <Mail className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" />
                    <a
                      href={`mailto:${restaurant.contact.email}`}
                      className="transition-colors group-hover:text-slate-900"
                    >
                      {restaurant.contact.email}
                    </a>
                  </div>
                )}
                {restaurant.contact.website && (
                  <div className="group flex items-center gap-2 text-slate-600 transition-colors hover:text-slate-900">
                    <LinkIcon className="h-4 w-4 text-slate-400 transition-colors group-hover:text-slate-600" />
                    <a
                      href={restaurant.contact.website}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors group-hover:text-slate-900"
                    >
                      {restaurant.contact.website}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {socialEntries.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900">
                  {labels.socialsTitle}
                </h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {socialEntries.map(({ key, icon: Icon, label, url }) => (
                    <a
                      key={key}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
