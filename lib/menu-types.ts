export type MenuLanguage = "en" | "ar"

export type LocalizedField = {
  en: string
  ar?: string | null
}

export type MenuRestaurant = {
  id: string
  name: string
  slug: string
  logoUrl: string | null
  description: string | null
  theme: "light" | "dark"
  defaultLanguage: "en" | "ar" | "both"
  contact: {
    phone?: string | null
    whatsapp?: string | null
    email?: string | null
  }
}

export type MenuBranch = {
  id: string
  name: string
  slug: string
  address?: string | null
  phone?: string | null
  whatsapp?: string | null
}

export type MenuItem = {
  id: string
  name: LocalizedField
  description: LocalizedField
  imageUrl: string | null
  price: {
    value: number
    currency: string
  }
  secondaryPrice?: {
    value: number
    currency: string
  } | null
  tags: {
    isNew: boolean
    isPopular: boolean
    isSpicy: boolean
    isVegetarian: boolean
    isVegan: boolean
    isGlutenFree: boolean
  }
  isAvailable: boolean
}

export type MenuCategory = {
  id: string
  name: LocalizedField
  description: LocalizedField
  isVisible: boolean
  isOffers: boolean
  items: MenuItem[]
}
