const FALLBACK_BASE_URL = "http://localhost:3000";

const stripTrailingSlash = (value: string) => value.replace(/\/+$/, "");

const resolveBaseUrl = () => {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) {
    return stripTrailingSlash(env);
  }

  if (typeof window !== "undefined" && window.location.origin) {
    return window.location.origin;
  }

  return FALLBACK_BASE_URL;
};

export const getPublicBaseUrl = () => resolveBaseUrl();

export function getPublicMenuUrl(
  restaurantSlug: string,
  branchSlug: string,
  language?: "en" | "ar"
): string {
  const baseUrl = resolveBaseUrl();
  const encoded = `${baseUrl}/m/${restaurantSlug}/${branchSlug}`;
  if (!language) return encoded;
  return `${encoded}?lang=${language}`;
}

export function getPublicMicrositeUrl(
  restaurantSlug: string,
  language?: "en" | "ar"
): string {
  const baseUrl = resolveBaseUrl();
  const encoded = `${baseUrl}/r/${restaurantSlug}`;
  if (!language) return encoded;
  return `${encoded}?lang=${language}`;
}
