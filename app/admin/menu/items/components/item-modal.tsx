// app/admin/menu/items/components/item-modal.tsx

"use client";

import { useEffect, useRef, useState } from "react";
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

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
  calories: string | number | null;

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
  calories: "",
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
  onSubmit: (
    values: ItemFormValues,
    options?: { file?: File | null; removeExistingImage?: boolean }
  ) => Promise<void> | void;
  loading?: boolean;
  uploadingImage?: boolean;
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
  uploadingImage,
}: ItemModalProps) {
  const startingValues: ItemFormValues =
    mode === "edit" && initialValues
      ? { ...EMPTY_VALUES, ...initialValues }
      : { ...EMPTY_VALUES };

  const [values, setValues] = useState<ItemFormValues>(startingValues);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    startingValues.image_url || null
  );
  const [fileError, setFileError] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const isSaving = Boolean(loading);
  const isUploadingImage = Boolean(uploadingImage);
  const disableInteractions = isSaving || isUploadingImage;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const resetPreview = (url: string | null) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewUrl(url);
  };

  useEffect(() => {
    if (mode === "edit" && initialValues) {
      const merged = { ...EMPTY_VALUES, ...initialValues };
      setValues(merged);
      setSelectedFile(null);
      resetPreview(merged.image_url || null);
      setRemoveExistingImage(false);
    } else if (mode === "create") {
      setValues({ ...EMPTY_VALUES });
      setSelectedFile(null);
      resetPreview(null);
      setRemoveExistingImage(false);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setFileError(null);
  }, [open, mode, initialValues]);

  useEffect(() => {
    return () => {
      if (previewObjectUrlRef.current) {
        URL.revokeObjectURL(previewObjectUrlRef.current);
      }
    };
  }, []);

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

  const triggerFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_MIME_TYPES.includes(file.type)) {
      setFileError("Only JPG, PNG, or WEBP files are allowed.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_IMAGE_BYTES) {
      setFileError("Image must be 5MB or smaller.");
      event.target.value = "";
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setRemoveExistingImage(false);

    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    previewObjectUrlRef.current = objectUrl;
    setPreviewUrl(objectUrl);
  };

  const handleClearFile = () => {
    const hadExisting = Boolean(values.image_url);
    setValues((prev) => ({
      ...prev,
      image_url: "",
    }));
    setSelectedFile(null);
    setFileError(null);
    resetPreview(null);
    setRemoveExistingImage(hadExisting);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (fileError) {
      alert("Please resolve the image selection error before submitting.");
      return;
    }

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

    if (values.calories !== "" && values.calories !== null) {
      const parsedCalories = Number(values.calories);
      if (!Number.isFinite(parsedCalories) || parsedCalories < 0) {
        alert("Calories must be a positive number.");
        return;
      }
    }

    await onSubmit(values, {
      file: selectedFile,
      removeExistingImage,
    });
  };

  const modalTitle = mode === "create" ? "Add New Item" : "Edit Item";
  const modalDescription =
    mode === "create"
      ? "Create a new menu item under one of your categories."
      : "Update this menu item's details.";

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !disableInteractions) {
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={handleOpenChange}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{modalTitle}</DialogTitle>
          <DialogDescription>{modalDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category + Status */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                    disabled={disableInteractions}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Available (not sold out)</span>
                  <Switch
                    checked={values.is_available}
                    onCheckedChange={handleToggle("is_available")}
                    disabled={disableInteractions}
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
                disabled={disableInteractions}
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
                disabled={disableInteractions}
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
                disabled={disableInteractions}
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
                disabled={disableInteractions}
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
                disabled={disableInteractions}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="calories">Calories (optional)</Label>
              <Input
                id="calories"
                type="number"
                min="0"
                step="1"
                value={values.calories ?? ""}
                onChange={handleChange("calories")}
                placeholder="e.g. 450"
                disabled={disableInteractions}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="primary_currency">Currency</Label>
              <Input
                id="primary_currency"
                value={values.primary_currency}
                onChange={handleChange("primary_currency")}
                placeholder="USD"
                disabled={disableInteractions}
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
                disabled={disableInteractions}
              />
            </div>
          </div>

          {/* Image + Code / Order */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-3 md:col-span-2">
              <Label>Item image</Label>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative h-32 w-full max-w-xs overflow-hidden rounded-md border bg-muted">
                  {previewUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={previewUrl}
                      alt={values.name_en || "Item preview"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No image selected
                    </div>
                  )}
                  {disableInteractions && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-medium">
                      {isUploadingImage ? "Uploading..." : "Saving..."}
                    </div>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={disableInteractions}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={triggerFilePicker}
                      disabled={disableInteractions}
                    >
                      {selectedFile ? "Change file" : "Upload image"}
                    </Button>
                    {(selectedFile || values.image_url) && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleClearFile}
                        disabled={disableInteractions}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  {selectedFile && (
                    <p className="text-xs text-muted-foreground">
                      {selectedFile.name} &middot;{" "}
                      {(selectedFile.size / 1024 / 1024).toFixed(2)}MB
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    JPG, PNG, or WEBP up to 5MB.
                  </p>
                  {fileError && (
                    <p className="text-xs text-red-500">{fileError}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="item_code">Item code (optional)</Label>
              <Input
                id="item_code"
                value={values.item_code}
                onChange={handleChange("item_code")}
                placeholder="e.g. B101"
                disabled={disableInteractions}
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
                  disabled={disableInteractions}
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
                    disabled={disableInteractions}
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
              disabled={disableInteractions}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={disableInteractions}>
              {disableInteractions
                ? isUploadingImage
                  ? "Uploading..."
                  : mode === "create"
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
