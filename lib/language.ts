export type SupportedLanguage = "en" | "ar";

export const resolveLanguageParam = (
  value: string | string[] | undefined
): SupportedLanguage | null => {
  if (!value) return null;
  const normalized = Array.isArray(value) ? value[0] : value;
  if (normalized === "en" || normalized === "ar") {
    return normalized;
  }
  return null;
};

export const determineInitialLanguage = (
  restaurantDefault: string | null | undefined,
  urlChoice: SupportedLanguage | null
): SupportedLanguage => {
  if (urlChoice) return urlChoice;
  if (restaurantDefault === "ar") {
    return "ar";
  }
  return "en";
};
