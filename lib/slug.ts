export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    || "branch";
}

export function ensureSlug(
  value: string | null | undefined,
  fallback: string
): string {
  const fallbackValue =
    fallback && fallback.trim().length > 0 ? fallback : "branch";
  const trimmed = value?.trim() ?? "";
  const shouldFallback =
    !trimmed ||
    /[\\/]/.test(trimmed) ||
    /^n\/?a$/i.test(trimmed);
  const base = shouldFallback ? fallbackValue : trimmed;
  return slugify(base);
}
