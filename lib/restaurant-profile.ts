export type RestaurantProfileMeta = {
  phoneCountryCode?: string;
  whatsappCountryCode?: string;
  conversionRate?: number | null;
  socials?: {
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    twitter?: string;
    youtube?: string;
  };
};

const META_DEFAULT: RestaurantProfileMeta = {
  phoneCountryCode: "+961",
  whatsappCountryCode: "+961",
  conversionRate: null,
  socials: {},
};

export const parseRestaurantProfileMeta = (
  value: unknown
): RestaurantProfileMeta => {
  if (!value || typeof value !== "string") {
    return { ...META_DEFAULT };
  }

  try {
    const parsed = JSON.parse(value) as RestaurantProfileMeta;
    const toNumber = (value: unknown) => {
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim().length) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };

    return {
      phoneCountryCode: parsed.phoneCountryCode ?? META_DEFAULT.phoneCountryCode,
      whatsappCountryCode:
        parsed.whatsappCountryCode ?? META_DEFAULT.whatsappCountryCode,
      conversionRate: (() => {
        const rate = toNumber(parsed.conversionRate);
        return rate && rate > 0 ? rate : META_DEFAULT.conversionRate;
      })(),
      socials: {
        instagram: parsed.socials?.instagram?.trim() ?? "",
        facebook: parsed.socials?.facebook?.trim() ?? "",
        tiktok: parsed.socials?.tiktok?.trim() ?? "",
        twitter: parsed.socials?.twitter?.trim() ?? "",
        youtube: parsed.socials?.youtube?.trim() ?? "",
      },
    };
  } catch {
    return { ...META_DEFAULT };
  }
};

export const serializeRestaurantProfileMeta = (
  meta: RestaurantProfileMeta
) => {
  const normalizedRate =
    typeof meta.conversionRate === "number"
      ? meta.conversionRate
      : typeof meta.conversionRate === "string"
        ? Number(meta.conversionRate)
        : null;

  const payload: RestaurantProfileMeta = {
    phoneCountryCode: meta.phoneCountryCode || META_DEFAULT.phoneCountryCode,
    whatsappCountryCode:
      meta.whatsappCountryCode || META_DEFAULT.whatsappCountryCode,
    conversionRate:
      normalizedRate && Number.isFinite(normalizedRate) && normalizedRate > 0
        ? normalizedRate
        : null,
    socials: {
      instagram: meta.socials?.instagram?.trim() || "",
      facebook: meta.socials?.facebook?.trim() || "",
      tiktok: meta.socials?.tiktok?.trim() || "",
      twitter: meta.socials?.twitter?.trim() || "",
      youtube: meta.socials?.youtube?.trim() || "",
    },
  };

  return JSON.stringify(payload);
};
