export type RestaurantProfileMeta = {
  phoneCountryCode?: string;
  whatsappCountryCode?: string;
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
    return {
      phoneCountryCode: parsed.phoneCountryCode ?? META_DEFAULT.phoneCountryCode,
      whatsappCountryCode:
        parsed.whatsappCountryCode ?? META_DEFAULT.whatsappCountryCode,
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
  const payload: RestaurantProfileMeta = {
    phoneCountryCode: meta.phoneCountryCode || META_DEFAULT.phoneCountryCode,
    whatsappCountryCode:
      meta.whatsappCountryCode || META_DEFAULT.whatsappCountryCode,
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
