// types/category.ts

export type Category = {
  id: string;
  restaurant_id: string;
  name_en: string;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  display_order: number;
  is_visible: boolean;
  is_offers: boolean;
  image_url: string | null;
  created_at: string;
  updated_at: string;
};
