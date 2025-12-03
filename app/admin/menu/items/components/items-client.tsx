// app/admin/menu/items/components/items-client.tsx

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import ItemModal, { ItemFormValues } from "./item-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { GripVertical, Loader2 } from "lucide-react";
import { uploadItemImage, removeItemImage } from "@/lib/client-uploads";

type ItemsClientProps = {
  categories: any[];
  items: any[];
};

export default function ItemsClient({
  categories,
  items: initialItems,
}: ItemsClientProps) {
  const [items, setItems] = useState(initialItems);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [draggingItemId, setDraggingItemId] = useState<string | null>(null);

  const categoriesById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

  const canInteract = !(saving || uploadingImage || reordering);

  const handleAddClick = () => {
    setMode("create");
    setEditingItem(null);
    setModalOpen(true);
  };

  const handleEditClick = (item: any) => {
    setMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    const confirm = window.confirm(
      "Are you sure you want to delete this item?"
    );
    if (!confirm) return;

    try {
      setSaving(true);
      const res = await fetch(`/api/admin/items/${itemId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "Failed to delete item");
        return;
      }

      setItems((prev) => prev.filter((it) => it.id !== itemId));
    } finally {
      setSaving(false);
    }
  };

  const persistItemOrder = async (
    categoryId: string,
    orderedIds: string[],
    previousItems: any[]
  ) => {
    try {
      setReordering(true);
      const res = await fetch("/api/admin/items/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId, orderedIds }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to reorder items");
      }
    } catch (err) {
      console.error(err);
      alert(
        err instanceof Error
          ? err.message
          : "Unable to save the new item order."
      );
      setItems(previousItems);
    } finally {
      setReordering(false);
    }
  };

  const reorderItems = async (targetItemId: string) => {
    if (!draggingItemId || draggingItemId === targetItemId) {
      setDraggingItemId(null);
      return;
    }

    const currentOrder = [...items];
    const sourceIndex = currentOrder.findIndex(
      (item) => item.id === draggingItemId
    );
    const targetIndex = currentOrder.findIndex(
      (item) => item.id === targetItemId
    );

    if (sourceIndex === -1 || targetIndex === -1) {
      setDraggingItemId(null);
      return;
    }

    const sourceItem = currentOrder[sourceIndex];
    const targetItem = currentOrder[targetIndex];

    if (sourceItem.category_id !== targetItem.category_id) {
      setDraggingItemId(null);
      return;
    }

    const updated = [...currentOrder];
    const [moved] = updated.splice(sourceIndex, 1);
    updated.splice(targetIndex, 0, moved);
    setItems(updated);
    setDraggingItemId(null);

    const orderedIds = updated
      .filter((item) => item.category_id === sourceItem.category_id)
      .map((item) => item.id);

    await persistItemOrder(sourceItem.category_id, orderedIds, currentOrder);
  };

  const handleDragStart = (
    event: React.DragEvent<HTMLTableRowElement>,
    itemId: string
  ) => {
    if (!canInteract) return;
    event.dataTransfer.effectAllowed = "move";
    setDraggingItemId(itemId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLTableRowElement>) => {
    if (!draggingItemId || !canInteract) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (
    event: React.DragEvent<HTMLTableRowElement>,
    targetId: string
  ) => {
    event.preventDefault();
    if (!canInteract) return;
    reorderItems(targetId);
  };

  const handleDragEnd = () => setDraggingItemId(null);

  const handleSubmit = async (
    values: ItemFormValues,
    options?: { file?: File | null; removeExistingImage?: boolean }
  ) => {
    const fileToUpload = options?.file ?? null;
    const removeExistingImage = options?.removeExistingImage ?? false;

    try {
      setSaving(true);

      if (!values.category_id) {
        alert("Please select a category");
        return;
      }

      const category = categoriesById[values.category_id];
      if (!category) {
        alert("Selected category not found");
        return;
      }

      const payload = {
        restaurant_id: category.restaurant_id,
        category_id: values.category_id,
        name_en: values.name_en,
        name_ar: values.name_ar || null,
        description_en: values.description_en || null,
        description_ar: values.description_ar || null,
        price: values.price ? Number(values.price) : 0,
        secondary_price: values.secondary_price
          ? Number(values.secondary_price)
          : null,
        primary_currency: values.primary_currency || "USD",
        secondary_currency: values.secondary_currency || null,
        image_url: values.image_url || null,
        is_new: values.is_new,
        is_popular: values.is_popular,
        is_spicy: values.is_spicy,
        is_vegetarian: values.is_vegetarian,
        is_vegan: values.is_vegan,
        is_gluten_free: values.is_gluten_free,
        is_visible: values.is_visible,
        is_available: values.is_available,
        item_code: values.item_code || null,
        display_order: values.display_order ?? 0,
      };

      if (mode === "create") {
        const res = await fetch("/api/admin/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            image_url: fileToUpload ? null : payload.image_url,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Failed to create item");
          return;
        }

        let createdItem = data.item;

        if (fileToUpload) {
          setUploadingImage(true);
          try {
            const uploadedUrl = await uploadItemImage({
              restaurantId: category.restaurant_id,
              itemId: createdItem.id,
              file: fileToUpload,
              existingUrl: createdItem.image_url ?? undefined,
            });

            const updateRes = await fetch(
              `/api/admin/items/${createdItem.id}`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image_url: uploadedUrl }),
              }
            );

            const updateData = await updateRes.json();
            if (!updateRes.ok) {
              alert(updateData.error || "Failed to attach uploaded image");
              return;
            }

            createdItem = updateData.item;
          } finally {
            setUploadingImage(false);
          }
        }

        setItems((prev) => [...prev, createdItem]);
      } else if (mode === "edit" && editingItem) {
        let nextImageUrl = payload.image_url;
        const existingImageUrl = editingItem.image_url || null;
        const shouldDeleteExisting =
          removeExistingImage && !fileToUpload && !!existingImageUrl;

        if (shouldDeleteExisting) {
          setUploadingImage(true);
          try {
            await removeItemImage(existingImageUrl as string);
            nextImageUrl = null;
          } catch (err) {
            console.error(err);
            alert(
              err instanceof Error
                ? err.message
                : "Failed to delete the existing image."
            );
            return;
          } finally {
            setUploadingImage(false);
          }
        }

        if (fileToUpload) {
          setUploadingImage(true);
          try {
            nextImageUrl = await uploadItemImage({
              restaurantId: category.restaurant_id,
              itemId: editingItem.id,
              file: fileToUpload,
              existingUrl: existingImageUrl ?? undefined,
            });
          } finally {
            setUploadingImage(false);
          }
        }

        const res = await fetch(`/api/admin/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            image_url: nextImageUrl,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Failed to update item");
          return;
        }

        setItems((prev) =>
          prev.map((it) => (it.id === editingItem.id ? data.item : it))
        );
      }

      setModalOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving the item."
      );
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  };

  const modalInitialValues: ItemFormValues | undefined =
    mode === "edit" && editingItem
      ? {
          id: editingItem.id,
          category_id: editingItem.category_id,
          name_en: editingItem.name_en || "",
          name_ar: editingItem.name_ar || "",
          description_en: editingItem.description_en || "",
          description_ar: editingItem.description_ar || "",
          price: editingItem.price ?? "",
          secondary_price: editingItem.secondary_price ?? "",
          primary_currency: editingItem.primary_currency || "USD",
          secondary_currency: editingItem.secondary_currency || "",
          image_url: editingItem.image_url || "",
          is_new: !!editingItem.is_new,
          is_popular: !!editingItem.is_popular,
          is_spicy: !!editingItem.is_spicy,
          is_vegetarian: !!editingItem.is_vegetarian,
          is_vegan: !!editingItem.is_vegan,
          is_gluten_free: !!editingItem.is_gluten_free,
          is_visible: !!editingItem.is_visible,
          is_available: !!editingItem.is_available,
          item_code: editingItem.item_code || "",
          display_order: editingItem.display_order ?? 0,
        }
      : undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Menu Items</h2>
          <p className="text-sm text-muted-foreground">
            Manage your menu items, prices, tags, and availability.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button asChild variant="outline">
            <Link href="/admin/menu/categories">View Categories</Link>
          </Button>
          <Button onClick={handleAddClick} disabled={!canInteract}>
            Add Item
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg border bg-gray-200 px-4 py-2 text-sm text-black">
        <span>Drag items within their category to control display order.</span>
        {reordering && (
          <span className="inline-flex items-center gap-1 text-primary">
            <Loader2 className="h-4 w-4 animate-spin" />
            Saving order...
          </span>
        )}
      </div>

      {/* Simple table view for now */}
     <div className="rounded-xl bg-white border shadow-sm overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-gray-50 text-gray-600 border-b">
      <tr>
        <th className="w-12 px-4 py-3"></th>
        <th className="px-6 py-3 text-left font-semibold">Item</th>
        <th className="px-6 py-3 text-left font-semibold">Category</th>
        <th className="px-6 py-3 text-left font-semibold">Price</th>
        <th className="px-6 py-3 text-left font-semibold">Tags</th>
        <th className="px-6 py-3 text-left font-semibold">Status</th>
        <th className="px-6 py-3 text-right font-semibold">Actions</th>
      </tr>
    </thead>

    <tbody className="divide-y">
      {items.map((item) => {
        const category = categories.find((c) => c.id === item.category_id);
        const isDragging = draggingItemId === item.id;

        return (
          <tr
            key={item.id}
            draggable={canInteract}
            onDragStart={(event) => handleDragStart(event, item.id)}
            onDragOver={handleDragOver}
            onDrop={(event) => handleDrop(event, item.id)}
            onDragEnd={handleDragEnd}
            className={cn(
              "hover:bg-gray-50 transition",
              isDragging && "bg-primary/5 opacity-70"
            )}
          >
            <td className="px-4 py-4 align-middle">
              <div className="flex h-8 w-8 items-center justify-center rounded-md border bg-white text-muted-foreground transition">
                <GripVertical className="h-4 w-4" />
              </div>
            </td>

            {/* ITEM WITH IMAGE */}
            <td className="px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
                  {item.image_url ? (
                    <Image
                      src={item.image_url}
                      alt={item.name_en}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      No Img
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-medium text-gray-900">
                    {item.name_en}
                  </div>
                  {item.name_ar && (
                    <div className="text-xs text-gray-500">{item.name_ar}</div>
                  )}
                </div>
              </div>
            </td>

            {/* CATEGORY */}
            <td className="px-6 py-4 text-gray-700">
              {category ? category.name_en : "-"}
            </td>

            {/* PRICE */}
            <td className="px-6 py-4 text-gray-700 whitespace-nowrap">
              {item.price != null ? (
                <>
                  {item.price}{" "}
                  <span className="text-xs text-gray-500">
                    {item.primary_currency || ""}
                  </span>
                </>
              ) : (
                "-"
              )}

              {item.secondary_price != null && (
                <div className="text-xs text-gray-500">
                  {item.secondary_price} {item.secondary_currency || ""}
                </div>
              )}
            </td>

            {/* TAGS */}
            <td className="px-6 py-4">
              <div className="flex flex-wrap gap-2">
                {item.is_new && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    New
                  </span>
                )}
                {item.is_popular && (
                  <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-700">
                    Popular
                  </span>
                )}
                {item.is_spicy && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                    Spicy
                  </span>
                )}
                {item.is_vegetarian && (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
                    Veg
                  </span>
                )}
                {item.is_vegan && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                    Vegan
                  </span>
                )}
              </div>
            </td>

            {/* STATUS */}
            <td className="px-6 py-4">
              <div className="flex flex-col gap-1">
                <span className="w-fit rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                  {item.is_visible ? "Visible" : "Hidden"}
                </span>
                <span className="w-fit rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                  {item.is_available ? "Available" : "Sold Out"}
                </span>
              </div>
            </td>

            {/* ACTIONS */}
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEditClick(item)}
                  className="rounded-md border border-gray-300 px-2 py-1 text-sm transition hover:bg-gray-100"
                  disabled={!canInteract}
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="rounded-md bg-red-100 px-3 py-1 text-sm text-red-700 transition hover:bg-red-200 disabled:opacity-50"
                  disabled={!canInteract}
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>


<ItemModal
  key={mode === "edit" ? editingItem?.id : `create-${modalOpen}`}
  open={modalOpen}
  mode={mode}
  categories={categories}
  initialValues={modalInitialValues}
  loading={saving}
  uploadingImage={uploadingImage}
  onClose={() => {
    if (!saving && !uploadingImage) {
      setModalOpen(false);
      setEditingItem(null);
    }
  }}
  onSubmit={handleSubmit}
/>

    </div>
  );
}
