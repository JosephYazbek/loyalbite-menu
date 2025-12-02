// app/admin/menu/categories/components/category-modal.tsx
"use client";

import { useEffect, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";
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

export type CategoryFormValues = {
  name_en: string;
  name_ar: string;
  description_en: string;
  description_ar: string;
  is_visible: boolean;
  is_offers: boolean;
  image_url: string;
};

const EMPTY_VALUES: CategoryFormValues = {
  name_en: "",
  name_ar: "",
  description_en: "",
  description_ar: "",
  is_visible: true,
  is_offers: false,
  image_url: "",
};

type CategoryModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initialValues?: CategoryFormValues;
  onClose: () => void;
  onSubmit: (values: CategoryFormValues) => Promise<void>;
};

export function CategoryModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
}: CategoryModalProps) {
  const [values, setValues] = useState<CategoryFormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever modal opens OR mode changes
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      setValues(initialValues);
    } else {
      setValues(EMPTY_VALUES);
    }

    setError(null);
    setLoading(false);
  }, [open, mode, initialValues]);

  const handleTextChange =
    (field: keyof CategoryFormValues) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setValues((prev) => ({ ...prev, [field]: value }));
    };

  const handleToggleChange =
    (field: "is_visible" | "is_offers") => (checked: boolean) => {
      setValues((prev) => ({ ...prev, [field]: checked }));
    };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!values.name_en.trim()) {
        setError("English name is required.");
        setLoading(false);
        return;
      }

      await onSubmit({
        ...values,
        name_en: values.name_en.trim(),
        name_ar: values.name_ar.trim(),
        description_en: values.description_en.trim(),
        description_ar: values.description_ar.trim(),
        image_url: values.image_url.trim(),
      });

      onClose();
    } catch (err) {
      console.error("[CategoryModal] submit error", err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const title = mode === "create" ? "Add Category" : "Edit Category";
  const description =
    mode === "create"
      ? "Create a new menu category for this restaurant."
      : "Update this category’s details.";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1">
            <Label htmlFor="name_en">Name (English)</Label>
            <Input
              id="name_en"
              value={values.name_en}
              onChange={handleTextChange("name_en")}
              placeholder="e.g. Burgers"
              required
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="name_ar">Name (Arabic)</Label>
            <Input
              id="name_ar"
              value={values.name_ar}
              onChange={handleTextChange("name_ar")}
              placeholder="مثال: برغر"
              dir="rtl"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description_en">Description (English)</Label>
            <Textarea
              id="description_en"
              value={values.description_en}
              onChange={handleTextChange("description_en")}
              placeholder="Short description shown under the category title."
              rows={2}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="description_ar">Description (Arabic)</Label>
            <Textarea
              id="description_ar"
              value={values.description_ar}
              onChange={handleTextChange("description_ar")}
              placeholder="وصف قصير يظهر تحت اسم الفئة."
              rows={2}
              dir="rtl"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              value={values.image_url}
              onChange={handleTextChange("image_url")}
              placeholder="Paste an image URL (e.g. from Supabase Storage)"
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Switch
                id="is_visible"
                checked={values.is_visible}
                onCheckedChange={handleToggleChange("is_visible")}
              />
              <Label htmlFor="is_visible">Visible in menu</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="is_offers"
                checked={values.is_offers}
                onCheckedChange={handleToggleChange("is_offers")}
              />
              <Label htmlFor="is_offers">Offers section</Label>
            </div>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

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
              {loading ? "Saving..." : mode === "create" ? "Create" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
