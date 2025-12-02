"use client"

import Image from "next/image"
import { CSSProperties, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  MenuBranch,
  MenuCategory,
  MenuLanguage,
  MenuRestaurant,
} from "@/lib/menu-types"
import { cn } from "@/lib/utils"

const TAGS_CONFIG: Array<{
  key: keyof MenuCategory["items"][number]["tags"]
  label: string
}> = [
  { key: "isNew", label: "New" },
  { key: "isPopular", label: "Popular" },
  { key: "isSpicy", label: "Spicy" },
  { key: "isVegetarian", label: "Veg" },
  { key: "isVegan", label: "Vegan" },
  { key: "isGlutenFree", label: "GF" },
]

type MenuExperienceProps = {
  restaurant: MenuRestaurant
  branch: MenuBranch
  categories: MenuCategory[]
  initialLanguage: MenuLanguage
  availableLanguages: MenuLanguage[]
  accentColor: string
}

export function MenuExperience({
  restaurant,
  branch,
  categories,
  initialLanguage,
  availableLanguages,
  accentColor,
}: MenuExperienceProps) {
  const [language, setLanguage] = useState<MenuLanguage>(initialLanguage)
  const dir = language === "ar" ? "rtl" : "ltr"

  const visibleCategories = useMemo(
    () => categories.filter((category) => category.isVisible),
    [categories]
  )

  const contactChips = [
    { label: "Phone", value: branch.phone ?? restaurant.contact.phone },
    {
      label: "WhatsApp",
      value: branch.whatsapp ?? restaurant.contact.whatsapp,
    },
    { label: "Email", value: restaurant.contact.email },
    { label: "Address", value: branch.address },
  ].filter((chip) => Boolean(chip.value))

  const style = {
    "--accent-color": accentColor,
  } as CSSProperties

  const translate = (field: { en: string; ar?: string | null }) => {
    if (language === "ar") {
      return field.ar && field.ar.trim().length ? field.ar : field.en
    }
    return field.en && field.en.trim().length ? field.en : field.ar ?? ""
  }

  return (
    <div
      dir={dir}
      className={cn(
        "min-h-screen",
        restaurant.theme === "dark"
          ? "bg-slate-950 text-slate-50"
          : "bg-slate-50 text-slate-900"
      )}
      style={style}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8 md:px-6">
        <header className="space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-md dark:border-white/10 dark:bg-white/5 md:flex md:items-center md:gap-6 md:space-y-0">
          {restaurant.logoUrl ? (
            <div className="mx-auto flex size-20 items-center justify-center overflow-hidden rounded-2xl border border-white/20 bg-white/10 md:mx-0">
              <Image
                src={restaurant.logoUrl}
                alt={restaurant.name}
                width={64}
                height={64}
                className="size-16 object-contain"
                unoptimized
              />
            </div>
          ) : (
            <div className="mx-auto flex size-20 items-center justify-center rounded-2xl border border-white/20 bg-white/10 text-3xl font-bold md:mx-0">
              {restaurant.name.slice(0, 2).toUpperCase()}
            </div>
          )}

          <div className="flex-1 space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center gap-2 text-xs uppercase tracking-widest text-muted-foreground md:justify-start">
              <span>{restaurant.name}</span>
              <span className="opacity-30">/</span>
              <span>{branch.name}</span>
            </div>
            <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
              {restaurant.name}
            </h1>
            {restaurant.description ? (
              <p className="text-sm text-muted-foreground">
                {restaurant.description}
              </p>
            ) : null}
          </div>

          {availableLanguages.length > 1 ? (
            <div className="flex justify-center gap-2 md:flex-col">
              {availableLanguages.map((langOption) => (
                <Button
                  key={langOption}
                  variant={language === langOption ? "default" : "outline"}
                  className={cn(
                    "min-w-[4rem]",
                    language === langOption &&
                      "bg-[color:var(--accent-color)] hover:bg-[color:var(--accent-color)]/90"
                  )}
                  onClick={() => setLanguage(langOption)}
                >
                  {langOption === "en" ? "EN" : "AR"}
                </Button>
              ))}
            </div>
          ) : null}
        </header>

        {contactChips.length ? (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm backdrop-blur">
            {contactChips.map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-muted-foreground"
              >
                <span className="text-xs uppercase tracking-wide text-white/50">
                  {chip.label}
                </span>
                <span className="font-medium text-white">{chip.value}</span>
              </div>
            ))}
          </div>
        ) : null}

        {visibleCategories.length ? (
          <nav className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-white/5 p-3 text-sm backdrop-blur">
            {visibleCategories.map((category) => (
              <a
                key={category.id}
                href={`#category-${category.id}`}
                className={cn(
                  "snap-start rounded-full border px-4 py-2 font-medium tracking-wide transition-colors",
                  category.isOffers
                    ? "border-[color:var(--accent-color)] text-[color:var(--accent-color)]"
                    : "border-white/20 text-white/80 hover:border-white/60 hover:text-white"
                )}
              >
                {translate(category.name)}
              </a>
            ))}
          </nav>
        ) : null}

        <section className="space-y-8">
          {visibleCategories.map((category) => {
            const categoryDescription = translate(category.description)
            return (
              <div
                key={category.id}
                id={`category-${category.id}`}
                className={cn(
                  "rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur",
                  category.isOffers && "border-[color:var(--accent-color)]"
                )}
              >
                <div className="mb-4 space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-semibold">
                      {translate(category.name)}
                    </h2>
                    {category.isOffers ? (
                      <span className="rounded-full border border-[color:var(--accent-color)] px-3 py-0.5 text-xs font-semibold text-[color:var(--accent-color)]">
                        Offers
                      </span>
                    ) : null}
                  </div>
                  {categoryDescription ? (
                    <p className="text-sm text-muted-foreground">
                      {categoryDescription}
                    </p>
                  ) : null}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {category.items.map((item) => {
                    const itemName = translate(item.name)
                    const itemDescription = translate(item.description)
                    return (
                      <article
                        key={item.id}
                        className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-black/5 p-4 shadow-sm backdrop-blur transition hover:border-white/20 md:flex-row"
                      >
                        {item.imageUrl ? (
                          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-white/10 md:w-32">
                            <Image
                              src={item.imageUrl}
                              alt={itemName}
                              fill
                              sizes="128px"
                              className="object-cover"
                              unoptimized
                            />
                          </div>
                        ) : null}
                        <div className="flex flex-1 flex-col gap-3">
                          <div className="flex flex-wrap items-start gap-2">
                            <h3 className="text-lg font-semibold leading-tight">
                              {itemName}
                            </h3>
                            {!item.isAvailable ? (
                              <span className="rounded-full border border-red-400/70 px-2 py-0.5 text-xs font-medium text-red-200">
                                Sold out
                              </span>
                            ) : null}
                          </div>
                          {itemDescription ? (
                            <p className="text-sm text-muted-foreground">
                              {itemDescription}
                            </p>
                          ) : null}
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-lg font-semibold text-[color:var(--accent-color)]">
                              {item.price.value.toLocaleString(undefined, {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                              })}{" "}
                              {item.price.currency}
                            </span>
                            {item.secondaryPrice ? (
                              <span className="text-sm text-muted-foreground">
                                {item.secondaryPrice.value.toLocaleString(
                                  undefined,
                                  {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 2,
                                  }
                                )}{" "}
                                {item.secondaryPrice.currency}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs">
                            {TAGS_CONFIG.filter(
                              (tag) => item.tags[tag.key]
                            ).map((tag) => (
                              <span
                                key={tag.key}
                                className="rounded-full border border-white/10 px-2 py-0.5 text-white/80"
                              >
                                {tag.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      </article>
                    )
                  })}
                  {!category.items.length ? (
                    <p className="rounded-xl border border-dashed border-white/10 px-4 py-8 text-center text-sm text-muted-foreground">
                      No items yet. Please check again soon.
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </section>
      </div>
    </div>
  )
}
