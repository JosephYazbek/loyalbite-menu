// app/admin/menu/categories/components/categories-client.tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import type { Category } from "@/types/category";
import { CategoryModal, CategoryFormValues } from "./category-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon, GripVertical, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  uploadCategoryImage,
  removeCategoryImage,
} from "@/lib/client-uploads";

type CategoriesClientProps = {
  restaurantName: string;
  restaurantId: string;
  initialCategories: Category[];
};

export function CategoriesClient({
  restaurantName,
  restaurantId,
  initialCategories,
}: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [duplicatingCategoryId, setDuplicatingCategoryId] = useState<string | null>(null);

  const canInteract = !(uploadingImage || reordering);

  const openCreate = () => {
    setMode("create");
    setEditingCategory(null);
    setModalOpen(true);
  };

  const openEdit = (category: Category) => {
    setMode("edit");
    setEditingCategory(category);
    setModalOpen(true);
  };

  const handleCreate = async (
    values: CategoryFormValues,
    options?: { file?: File | null; removeExistingImage?: boolean }
  ) => {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) throw new Error("Failed to create category");
    const { category } = await res.json();

    let created = category as Category;

    if (options?.file) {
      setUploadingImage(true);
      try {
        const uploadedUrl = await uploadCategoryImage({
          restaurantId,
          categoryId: category.id,
          file: options.file,
        });

        const updateRes = await fetch(`/api/admin/categories/${category.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: uploadedUrl }),
        });

        if (updateRes.ok) {
          const data = await updateRes.json();
          created = data.category;
        }
      } finally {
        setUploadingImage(false);
      }
    }

    setCategories((prev) => [...prev, created]);
  };

  const handleUpdate = async (
    values: CategoryFormValues,
    options?: { file?: File | null; removeExistingImage?: boolean }
  ) => {
    if (!editingCategory) return;

    let nextImageUrl = values.image_url || null;
    const existingImageUrl = editingCategory.image_url || null;

    const shouldRemoveExisting =
      (options?.removeExistingImage ?? false) && !!existingImageUrl;

    if (shouldRemoveExisting && !options?.file && existingImageUrl) {
      setUploadingImage(true);
      try {
        await removeCategoryImage(existingImageUrl);
        nextImageUrl = null;
      } finally {
        setUploadingImage(false);
      }
    }

    if (options?.file) {
      setUploadingImage(true);
      try {
        nextImageUrl = await uploadCategoryImage({
          restaurantId,
          categoryId: editingCategory.id,
          file: options.file,
          existingUrl: existingImageUrl ?? undefined,
        });
      } finally {
        setUploadingImage(false);
      }
    }

    const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        image_url: nextImageUrl,
      }),
    });

    if (!res.ok) throw new Error("Failed to update category");
    const { category } = await res.json();

    setCategories((prev) =>
      prev.map((cat) => (cat.id === category.id ? category : cat))
    );
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category?")) return;

    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete category");
    setCategories((prev) => prev.filter((cat) => cat.id !== id));
  };

  const handleDuplicate = async (category: Category) => {
    setDuplicatingCategoryId(category.id);
    try {
      const res = await fetch(`/api/admin/categories/${category.id}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || "Failed to duplicate category");
        return;
      }
      if (data.category) {
        setCategories((prev) => [...prev, data.category as Category]);
      }
      alert("Category duplicated.");
    } catch (error) {
      console.error(error);
      alert("Failed to duplicate category");
    } finally {
      setDuplicatingCategoryId(null);
    }
  };

  const persistOrder = async (orderedIds: string[], previous: Category[]) => {
    try {
      setReordering(true);
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reorder categories");
      }
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Unable to save the new category order."
      );
      setCategories(previous);
    } finally {
      setReordering(false);
    }
  };

  const reorderCategories = async (targetId: string) => {
    if (!draggingId || draggingId === targetId) {
      setDraggingId(null);
      return;
    }

    const currentOrder = [...categories];
    const sourceIndex = currentOrder.findIndex((c) => c.id === draggingId);
    const targetIndex = currentOrder.findIndex((c) => c.id === targetId);

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggingId(null);
      return;
    }

    const updated = [...currentOrder];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setCategories(updated);
    setDraggingId(null);

    const orderedIds = updated.map((cat) => cat.id);
    await persistOrder(orderedIds, currentOrder);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLTableRowElement>,
    id: string
  ) => {
    if (!canInteract) return;
    event.dataTransfer.effectAllowed = "move";
    setDraggingId(id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    if (!draggingId || !canInteract) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLTableRowElement>,
    targetId: string
  ) => {
    event.preventDefault();
    if (!canInteract) return;
    reorderCategories(targetId);
  };

  const handleDragEnd = () => setDraggingId(null);

  const modalInitialValues: CategoryFormValues | undefined =
    mode === "edit" && editingCategory
      ? {
          name_en: editingCategory.name_en ?? "",
          name_ar: editingCategory.name_ar ?? "",
          description_en: editingCategory.description_en ?? "",
          description_ar: editingCategory.description_ar ?? "",
          image_url: editingCategory.image_url ?? "",
          is_visible: editingCategory.is_visible,
          is_offers: editingCategory.is_offers,
        }
      : undefined;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            Menu
          </p>
          <h1 className="text-2xl font-semibold text-foreground">Menu Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage the categories for <strong>{restaurantName}</strong>.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/menu/items">View Items</Link>
          </Button>
          <Button onClick={openCreate} disabled={!canInteract}>
            + Add Category
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
        <span>Drag categories with the handle to control how they appear.</span>
        {reordering && (
          <span className="inline-flex items-center gap-1 text-primary pl-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving order...
          </span>
        )}
      </div>

      <div className="rounded-3xl border border-border bg-card shadow-sm ring-1 ring-black/5 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border/80 bg-secondary text-muted-foreground">
            <tr>
              <th className="w-12 px-4 py-3 text-left" />
              <th className="px-4 py-3 text-left font-semibold">Category</th>
              <th className="px-4 py-3 text-left font-semibold">Description</th>
              <th className="px-4 py-3 text-left font-semibold">Flags</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {categories.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center opacity-60">
                  No categories yet.
                </td>
              </tr>
            )}

            {categories.map((cat) => {
              const isDragging = draggingId === cat.id;
              return (
                <tr
                  key={cat.id}
                  draggable={canInteract}
                  onDragStart={(event) => handleDragStart(event, cat.id)}
                  onDragOver={handleDragOver}
                  onDrop={(event) => handleDrop(event, cat.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "border-t border-border/60 bg-card hover:bg-secondary/40",
                    isDragging && "bg-primary/5"
                  )}
                >
                  <td className="px-4 py-3 align-middle">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition">
                      <GripVertical className="h-4 w-4" />
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {cat.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={cat.image_url}
                          alt={cat.name_en}
                          className="h-10 w-10 rounded border object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded border border-border text-xs text-muted-foreground">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-foreground">
                          {cat.name_en}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Order #{cat.display_order}
                        </div>
                        {cat.is_offers && (
                          <div className="text-xs font-semibold text-amber-600">
                            Offers section
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-3">
                    {cat.description_en || (
                      <span className="opacity-40">&mdash;</span>
                    )}
                  </td>

                  <td className="px-4 py-3 space-x-2">
                    {cat.is_visible && <Badge>Visible</Badge>}
                    {cat.is_offers && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                        Offers
                      </Badge>
                    )}
                  </td>

                  <td className="px-4 py-3 text-right space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openEdit(cat)}
                      disabled={!canInteract}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDuplicate(cat)}
                      disabled={
                        !canInteract || duplicatingCategoryId === cat.id
                      }
                    >
                      Duplicate
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(cat.id)}
                      disabled={!canInteract}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <CategoryModal
        key={modalOpen ? `${mode}-${editingCategory?.id || "new"}` : "closed"}
        open={modalOpen}
        mode={mode}
        initialValues={modalInitialValues}
        uploadingImage={uploadingImage}
        onClose={() => {
          if (!uploadingImage) {
            setModalOpen(false);
            setEditingCategory(null);
          }
        }}
        onSubmit={mode === "create" ? handleCreate : handleUpdate}
      />
    </div>
  );
}
