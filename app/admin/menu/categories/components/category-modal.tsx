// app/admin/menu/categories/components/category-modal.tsx
"use client";

import { useState, useEffect } from "react";
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

type Props = {
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
}: Props) {
  const [values, setValues] = useState<CategoryFormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Load the right values whenever the modal is opened
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      setValues(initialValues);
    } else if (mode === "create") {
      setValues(EMPTY_VALUES);
    }
  }, [open, mode, initialValues]);

  // Only responsible for closing the dialog
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) onClose();
  };

  const handleField =
    (field: keyof CategoryFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | boolean) => {
      if (typeof e === "boolean") {
        setValues((v) => ({ ...v, [field]: e }));
      } else {
        setValues((v) => ({ ...v, [field]: e.target.value }));
      }
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSubmit(values);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Category" : "Edit Category"}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Create a new menu category."
              : "Update this category’s details."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Name (English)</Label>
            <Input
              placeholder="e.g. Burgers"
              value={values.name_en}
              onChange={handleField("name_en")}
              required
            />
          </div>

          <div>
            <Label>Name (Arabic)</Label>
            <Input
              placeholder="مثال: برغر"
              value={values.name_ar}
              onChange={handleField("name_ar")}
              dir="rtl"
            />
          </div>

          <div>
            <Label>Description (English)</Label>
            <Textarea
              placeholder="Short description shown under the category title."
              value={values.description_en}
              onChange={handleField("description_en")}
              rows={2}
            />
          </div>

          <div>
            <Label>Description (Arabic)</Label>
            <Textarea
              placeholder="وصف قصير يظهر تحت اسم الفئة."
              value={values.description_ar}
              onChange={handleField("description_ar")}
              dir="rtl"
              rows={2}
            />
          </div>

          <div>
            <Label>Image URL</Label>
            <Input
              placeholder="Paste an image URL (e.g., from Supabase Storage)"
              value={values.image_url}
              onChange={handleField("image_url")}
            />
          </div>

          <div className="flex justify-between">
            <div className="flex items-center gap-2">
              <Switch
                checked={values.is_visible}
                onCheckedChange={handleField("is_visible")}
              />
              <Label>Visible in menu</Label>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={values.is_offers}
                onCheckedChange={handleField("is_offers")}
              />
              <Label>Offers section</Label>
            </div>
          </div>

          {error && <p className="text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
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
