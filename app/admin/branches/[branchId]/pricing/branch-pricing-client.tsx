"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type BranchPricingCategory = {
  id: string;
  name_en: string | null;
  name_ar: string | null;
  display_order: number | null;
};

export type BranchPricingItem = {
  id: string;
  category_id: string;
  name_en: string | null;
  name_ar: string | null;
  price: number | string | null;
  secondary_price: number | string | null;
  is_available: boolean | null;
  display_order: number | null;
};

export type BranchPricingOverride = {
  item_id: string;
  price: number | string | null;
  secondary_price: number | string | null;
  is_available: boolean | null;
  display_order: number | string | null;
};

type AvailabilityMode = "base" | "available" | "sold_out";

type OverrideState = {
  price: string;
  secondaryPrice: string;
  availability: AvailabilityMode;
  displayOrder: string;
};

type BranchPricingClientProps = {
  branch: {
    id: string;
    name: string;
  };
  categories: BranchPricingCategory[];
  items: BranchPricingItem[];
  overrides: BranchPricingOverride[];
};

const formatCurrency = (value: number | string | null | undefined) => {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric =
    typeof value === "number" ? value : Number.parseFloat(String(value));

  if (!Number.isFinite(numeric)) {
    return typeof value === "string" ? value : "—";
  }

  return numeric.toFixed(2);
};

export default function BranchPricingClient({
  branch,
  categories,
  items,
  overrides,
}: BranchPricingClientProps) {
  const overridesMap = useMemo(() => {
    const map = new Map<string, BranchPricingOverride>();
    overrides.forEach((override) => {
      map.set(override.item_id, override);
    });
    return map;
  }, [overrides]);

  const initialState = useMemo(() => {
    const base: Record<string, OverrideState> = {};
    items.forEach((item) => {
      const override = overridesMap.get(item.id);
      base[item.id] = {
        price:
          override && override.price !== null && override.price !== undefined
            ? String(override.price)
            : "",
        secondaryPrice:
          override &&
          override.secondary_price !== null &&
          override.secondary_price !== undefined
            ? String(override.secondary_price)
            : "",
        availability:
          override && override.is_available !== null
            ? override.is_available
              ? "available"
              : "sold_out"
            : "base",
        displayOrder:
          override &&
          override.display_order !== null &&
          override.display_order !== undefined
            ? String(override.display_order)
            : "",
      };
    });
    return base;
  }, [items, overridesMap]);

  const [state, setState] =
    useState<Record<string, OverrideState>>(initialState);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStateChange = (
    itemId: string,
    field: keyof OverrideState,
    value: string
  ) => {
    setState((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }));
  };

  const handleAvailabilityChange = (itemId: string, value: AvailabilityMode) => {
    setState((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        availability: value,
      },
    }));
  };

  const normalizeNumber = (value: string) => {
    if (!value || !value.trim()) return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const payload = items.map((item) => {
        const current = state[item.id] ?? {
          price: "",
          secondaryPrice: "",
          availability: "base",
          displayOrder: "",
        };
        const price = normalizeNumber(current.price);
        const secondaryPrice = normalizeNumber(current.secondaryPrice);
        const displayOrder = normalizeNumber(current.displayOrder);
        const availability =
          current.availability === "base"
            ? null
            : current.availability === "available";

        return {
          itemId: item.id,
          price,
          secondaryPrice,
          displayOrder,
          isAvailable: availability,
        };
      });

      const response = await fetch(
        `/api/admin/branches/${branch.id}/pricing`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchId: branch.id, items: payload }),
        }
      );

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Failed to save overrides");
      }

      setMessage("Branch pricing updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error");
    } finally {
      setSaving(false);
    }
  };

  const groupedItems = useMemo(() => {
    const byCategory = new Map<string, BranchPricingItem[]>();
    items.forEach((item) => {
      const list = byCategory.get(item.category_id) ?? [];
      list.push(item);
      byCategory.set(item.category_id, list);
    });
    return byCategory;
  }, [items]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Branch pricing
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">
            {branch.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            These overrides apply only to this branch. Leave fields blank to use
            the base menu values.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/branches">
            <Button variant="outline">Back to branches</Button>
          </Link>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save branch prices"}
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        These overrides affect only {branch.name}. Prices left blank will fall
        back to the base item values.
      </div>

      {message && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {message}
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/80 p-8 text-center text-sm text-muted-foreground shadow-sm">
          No categories yet. Create menu items before configuring branch-level
          prices.
        </div>
      ) : (
        categories.map((category) => {
          const categoryItems = (groupedItems.get(category.id) ?? []).sort(
            (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
          );

          if (categoryItems.length === 0) {
            return null;
          }

          return (
            <section
              key={category.id}
              className="space-y-3 rounded-3xl border border-border bg-card p-5 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">
                  {category.name_en ?? category.name_ar ?? "Category"}
                </h2>
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {categoryItems.length} item{categoryItems.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Item</th>
                      <th className="px-3 py-2 font-medium">Base price</th>
                      <th className="px-3 py-2 font-medium">Branch price</th>
                      <th className="px-3 py-2 font-medium">
                        Branch secondary
                      </th>
                      <th className="px-3 py-2 font-medium">Availability</th>
                      <th className="px-3 py-2 font-medium">Branch order</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {categoryItems.map((item) => {
                      const current = state[item.id];
                      return (
                        <tr key={item.id} className="align-top">
                          <td className="px-3 py-3">
                            <div className="font-medium text-foreground">
                              {item.name_en ?? item.name_ar ?? "Item"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Base secondary: {formatCurrency(item.secondary_price)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Base availability:{" "}
                              {item.is_available === false ? "Sold out" : "Available"}
                            </div>
                          </td>
                          <td className="px-3 py-3 text-sm text-muted-foreground">
                            {formatCurrency(item.price)}
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={current?.price ?? ""}
                              onChange={(e) =>
                                handleStateChange(item.id, "price", e.target.value)
                              }
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              placeholder="Use base"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              step="0.01"
                              value={current?.secondaryPrice ?? ""}
                              onChange={(e) =>
                                handleStateChange(
                                  item.id,
                                  "secondaryPrice",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              placeholder="Use base"
                            />
                          </td>
                          <td className="px-3 py-3">
                            <select
                              value={current?.availability ?? "base"}
                              onChange={(e) =>
                                handleAvailabilityChange(
                                  item.id,
                                  e.target.value as AvailabilityMode
                                )
                              }
                              className="w-full rounded-md border border-border bg-background px-2 py-2 text-sm"
                            >
                              <option value="base">Use base</option>
                              <option value="available">Force available</option>
                              <option value="sold_out">Force sold out</option>
                            </select>
                          </td>
                          <td className="px-3 py-3">
                            <input
                              type="number"
                              value={current?.displayOrder ?? ""}
                              onChange={(e) =>
                                handleStateChange(
                                  item.id,
                                  "displayOrder",
                                  e.target.value
                                )
                              }
                              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                              placeholder="Use base"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}


