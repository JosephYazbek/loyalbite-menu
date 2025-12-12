export type ModifierOption = {
  id: string;
  name: string;
  price: number | null;
};

export type ModifierGroup = {
  id: string;
  restaurant_id?: string | null;
  name: string;
  min_choices: number | null;
  max_choices: number | null;
  options: ModifierOption[];
};

export type DbCategoryRow = {
  id: string;
  restaurant_id?: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  display_order: number | null;
  is_visible: boolean | null;
  is_offers: boolean | null;
};

export type DbItemRow = {
  id: string;
  restaurant_id?: string;
  category_id: string;
  name_en: string | null;
  name_ar: string | null;
  description_en: string | null;
  description_ar: string | null;
  price: number | string | null;
  secondary_price: number | string | null;
  primary_currency: string | null;
  secondary_currency: string | null;
  calories: number | string | null;
  image_url: string | null;
  is_new: boolean | null;
  is_popular: boolean | null;
  is_spicy: boolean | null;
  is_vegetarian: boolean | null;
  is_vegan: boolean | null;
  is_gluten_free: boolean | null;
  is_available: boolean | null;
  is_visible: boolean | null;
  diet_category: string | null;
  display_order: number | null;
  item_code?: string | null;
  contains_dairy?: boolean | null;
  contains_nuts?: boolean | null;
  contains_eggs?: boolean | null;
  contains_shellfish?: boolean | null;
  contains_soy?: boolean | null;
  contains_sesame?: boolean | null;
  is_featured?: boolean | null;
  recommendation_score?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ItemBranchOverrideRow = {
  item_id: string;
  price: number | string | null;
  secondary_price: number | string | null;
  is_available: boolean | null;
  display_order: number | null;
};

export type MenuItem = DbItemRow & {
  modifiers?: ModifierGroup[];
  favorite?: boolean;
};

export type MenuCategory = DbCategoryRow & {
  items: MenuItem[];
};

export type PublicRestaurantMeta = {
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

export type PublicBranchMeta = {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  whatsappNumber: string | null;
};

export type MenuSnapshotPayload = {
  id?: string;
  created_at?: string;
  restaurant_id?: string;
  branch_id?: string;
  categories: MenuCategory[];
  accentColor?: string;
  restaurant?: PublicRestaurantMeta;
  branch?: PublicBranchMeta;
};

export type PublicMenuPayload = {
  restaurant: PublicRestaurantMeta;
  branch: PublicBranchMeta;
  categories: MenuCategory[];
  accentColor: string;
  fromSnapshot: boolean;
  snapshotId?: string | null;
};
