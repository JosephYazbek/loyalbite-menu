// app/admin/menu/items/components/item-modal.tsx

"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ItemFormValues = {
  id?: string;
  category_id: string;

  name_en: string;
  name_ar: string;

  description_en: string;
  description_ar: string;

  price: string | number;
  secondary_price: string | number | null;
  primary_currency: string;
  secondary_currency: string;

  image_url: string;

  is_new: boolean;
  is_popular: boolean;
  is_spicy: boolean;
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;

  is_visible: boolean;
  is_available: boolean;

  item_code: string;
  display_order: number;
};

const EMPTY_VALUES: ItemFormValues = {
  category_id: "",
  name_en: "",
  name_ar: "",
  description_en: "",
  description_ar: "",
  price: "",
  secondary_price: "",
  primary_currency: "USD",
  secondary_currency: "",
  image_url: "",
  is_new: false,
  is_popular: false,
  is_spicy: false,
  is_vegetarian: false,
  is_vegan: false,
  is_gluten_free: false,
  is_visible: true,
  is_available: true,
  item_code: "",
  display_order: 0,
};

type ItemModalProps = {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  categories: any[];
  initialValues?: ItemFormValues;
  onSubmit: (values: ItemFormValues) => Promise<void> | void;
  loading?: boolean;
};

const TAGS_CONFIG: {
  key:
    | "is_new"
    | "is_popular"
    | "is_spicy"
    | "is_vegetarian"
    | "is_vegan"
    | "is_gluten_free";
  label: string;
}[] = [
  { key: "is_new", label: "New" },
  { key: "is_popular", label: "Popular" },
  { key: "is_spicy", label: "Spicy" },
  { key: "is_vegetarian", label: "Vegetarian" },
  { key: "is_vegan", label: "Vegan" },
  { key: "is_gluten_free", label: "Gluten-Free" },
];

export default function ItemModal({
  open,
  onClose,
  mode,
  categories,
  initialValues,
  onSubmit,
  loading,
}: ItemModalProps) {
const startingValues: ItemFormValues =
  mode === "edit" && initialValues
    ? { ...EMPTY_VALUES, ...initialValues }
    : { ...EMPTY_VALUES };

// Initialize state ONCE using startingValues
const [values, setValues] = useState<ItemFormValues>(startingValues);
// Reset form when modal is opened OR initialValues changes
useEffect(() => {
  if (mode === "edit" && initialValues) {
    setValues({ ...EMPTY_VALUES, ...initialValues });
  } else if (mode === "create") {
    setValues({ ...EMPTY_VALUES });
  }
}, [open, mode, initialValues]);

  const handleChange =
    (field: keyof ItemFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({
        ...prev,
        [field]: e.target.value,
      }));
    };

  const handleToggle =
    (field: keyof ItemFormValues) => (checked: boolean) => {
      setValues((prev) => ({
        ...prev,
        [field]: checked,
      }));
    };

  const handleTagToggle = (
    key:
      | "is_new"
      | "is_popular"
      | "is_spicy"
      | "is_vegetarian"
      | "is_vegan"
      | "is_gluten_free"
  ) => {
    setValues((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.category_id) {
      alert("Please select a category");
      return;
    }

    if (!values.name_en.trim()) {
      alert("Please enter an English name");
      return;
    }

    if (!values.price || Number(values.price) <= 0) {
      alert("Please enter a valid price");
      return;
    }

    await onSubmit(values);
  };

  const modalTitle = mode === "create" ? "Add New Item" : "Edit Item";
  const modalDescription =
    mode === "create"
      ? "Create a new menu item under one of your categories."
      : "Update this menu item’s details.";

  return (
    <Dialog open={open} onOpenChange={() => !loading && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category + Status */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="category_id">Category</Label>
              <select
                id="category_id"
                value={values.category_id}
                onChange={(e) =>
                  setValues((prev) => ({
                    ...prev,
                    category_id: e.target.value,
                  }))
                }
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Select category...</option>
                {categories
                  .filter((c) => c.is_visible !== false)
                  .sort(
                    (a, b) =>
                      (a.display_order ?? 0) - (b.display_order ?? 0)
                  )
                  .map((cat: any) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name_en}
                      {cat.name_ar ? ` / ${cat.name_ar}` : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex flex-col gap-2 rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Visible</span>
                  <Switch
                    checked={values.is_visible}
                    onCheckedChange={handleToggle("is_visible")}
                    disabled={loading}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Available (not sold out)</span>
                  <Switch
                    checked={values.is_available}
                    onCheckedChange={handleToggle("is_available")}
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Names */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name_en">Name (English)</Label>
              <Input
                id="name_en"
                value={values.name_en}
                onChange={handleChange("name_en")}
                placeholder="Chicken Burger"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name_ar">Name (Arabic)</Label>
              <Input
                id="name_ar"
                dir="rtl"
                value={values.name_ar}
                onChange={handleChange("name_ar")}
                placeholder="برغر دجاج"
                disabled={loading}
              />
            </div>
          </div>

          {/* Descriptions */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="description_en">Description (English)</Label>
              <Textarea
                id="description_en"
                value={values.description_en}
                onChange={handleChange("description_en")}
                placeholder="Grilled chicken breast, lettuce, tomato, house sauce..."
                disabled={loading}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description_ar">Description (Arabic)</Label>
              <Textarea
                id="description_ar"
                dir="rtl"
                value={values.description_ar}
                onChange={handleChange("description_ar")}
                placeholder="صدر دجاج مشوي مع خس وطماطم وصلصة خاصة..."
                disabled={loading}
                rows={3}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="price">Price</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                value={values.price}
                onChange={handleChange("price")}
                placeholder="10.00"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_currency">Currency</Label>
              <Input
                id="primary_currency"
                value={values.primary_currency}
                onChange={handleChange("primary_currency")}
                placeholder="USD"
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="secondary_price">Secondary price (optional)</Label>
              <Input
                id="secondary_price"
                type="number"
                min="0"
                step="0.01"
                value={values.secondary_price ?? ""}
                onChange={handleChange("secondary_price")}
                placeholder="e.g. LBP equivalent"
                disabled={loading}
              />
            </div>
          </div>

          {/* Image + Code / Order */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="image_url">Image URL</Label>
              <Input
                id="image_url"
                value={values.image_url}
                onChange={handleChange("image_url")}
                placeholder="https://..."
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Later you can switch this to direct upload (Supabase Storage). For
                now, paste an image URL.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_code">Item code (optional)</Label>
              <Input
                id="item_code"
                value={values.item_code}
                onChange={handleChange("item_code")}
                placeholder="e.g. B101"
                disabled={loading}
              />
              <div className="mt-3 space-y-2">
                <Label htmlFor="display_order">Display order</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={values.display_order}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      display_order: Number(e.target.value) || 0,
                    }))
                  }
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* Tags as pill badges */}
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex flex-wrap gap-2">
              {TAGS_CONFIG.map((tag) => {
                const active = values[tag.key];

                return (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => handleTagToggle(tag.key)}
                    disabled={loading}
                    className={cn(
                      "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading
                ? mode === "create"
                  ? "Creating..."
                  : "Saving..."
                : mode === "create"
                ? "Create Item"
                : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
