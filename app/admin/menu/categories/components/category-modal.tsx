// app/admin/menu/categories/components/category-modal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
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

const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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
  onSubmit: (
    values: CategoryFormValues,
    options?: { file?: File | null; removeExistingImage?: boolean }
  ) => Promise<void>;
  uploadingImage?: boolean;
};

export function CategoryModal({
  open,
  mode,
  initialValues,
  onClose,
  onSubmit,
  uploadingImage,
}: Props) {
  const [values, setValues] = useState<CategoryFormValues>(EMPTY_VALUES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  const isUploading = Boolean(uploadingImage);
  const isBusy = loading || isUploading;

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewObjectUrlRef = useRef<string | null>(null);

  const resetPreview = (url: string | null) => {
    if (previewObjectUrlRef.current) {
      URL.revokeObjectURL(previewObjectUrlRef.current);
      previewObjectUrlRef.current = null;
    }
    setPreviewUrl(url);
  };

  // Load the right values whenever the modal is opened
  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialValues) {
      setValues(initialValues);
      setSelectedFile(null);
      resetPreview(initialValues.image_url || null);
      setRemoveExistingImage(false);
    } else if (mode === "create") {
      setValues(EMPTY_VALUES);
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

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && !isBusy) onClose();
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

    const url = URL.createObjectURL(file);
    previewObjectUrlRef.current = url;
    setPreviewUrl(url);
  };

  const handleClearFile = () => {
    const hadExisting = Boolean(values.image_url);
    setValues((prev) => ({ ...prev, image_url: "" }));
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
      setError(fileError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await onSubmit(values, {
        file: selectedFile,
        removeExistingImage,
      });
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
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
              disabled={isBusy}
            />
          </div>

          <div>
            <Label>Name (Arabic)</Label>
            <Input
              placeholder="مثال: برغر"
              value={values.name_ar}
              onChange={handleField("name_ar")}
              dir="rtl"
              disabled={isBusy}
            />
          </div>

          <div>
            <Label>Description (English)</Label>
            <Textarea
              placeholder="Short description shown under the category title."
              value={values.description_en}
              onChange={handleField("description_en")}
              rows={2}
              disabled={isBusy}
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
              disabled={isBusy}
            />
          </div>

          <div className="space-y-2">
            <Label>Category image</Label>
            <div className="flex flex-col gap-3">
              <div className="relative h-32 w-full overflow-hidden rounded-md border bg-muted">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrl}
                    alt={values.name_en || "Category preview"}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                    No image selected
                  </div>
                )}
                {isBusy && (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/70 text-xs font-medium">
                    {isUploading ? "Uploading..." : "Saving..."}
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={handleFileChange}
                disabled={isBusy}
              />

              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={triggerFilePicker}
                  disabled={isBusy}
                >
                  {selectedFile ? "Change file" : "Upload image"}
                </Button>
                {(selectedFile || values.image_url) && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleClearFile}
                    disabled={isBusy}
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

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 px-3 py-2">
              <div className="flex flex-col">
                <Label className="text-sm font-medium">Visible in menu</Label>
                <p className="text-xs text-muted-foreground">
                  Hide this category to keep it off the public menu.
                </p>
              </div>
              <Switch
                checked={values.is_visible}
                onCheckedChange={handleField("is_visible")}
                disabled={isBusy}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card/40 px-3 py-3">
              <div className="flex flex-col">
                <Label className="text-sm font-medium">Use as Offers section</Label>
                <p className="text-xs text-muted-foreground">
                  Items in this category will be highlighted at the top of your menu as special offers.
                </p>
              </div>
              <Switch
                checked={values.is_offers}
                onCheckedChange={handleField("is_offers")}
                disabled={isBusy}
                aria-label="Use as Offers section"
              />
            </div>
          </div>

          {error && <p className="text-red-600">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isBusy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isBusy
                ? isUploading
                  ? "Uploading..."
                  : "Saving..."
                : mode === "create"
                ? "Create"
                : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
