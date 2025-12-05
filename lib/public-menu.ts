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

export function getPublicMenuUrl(
  restaurantSlug: string,
  branchSlug: string
): string {
  const baseUrl = resolveBaseUrl();
  return `${baseUrl}/m/${restaurantSlug}/${branchSlug}`;
}
