// app/admin/menu/items/components/items-client.tsx

"use client";

import { useMemo, useState } from "react";
import ItemModal, { ItemFormValues } from "./item-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

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

  const categoriesById = useMemo(() => {
    const map: Record<string, any> = {};
    for (const c of categories) map[c.id] = c;
    return map;
  }, [categories]);

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

  const handleSubmit = async (values: ItemFormValues) => {
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
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        if (!res.ok) {
          alert(data.error || "Failed to create item");
          return;
        }

        setItems((prev) => [...prev, data.item]);
      } else if (mode === "edit" && editingItem) {
        const res = await fetch(`/api/admin/items/${editingItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Menu Items</h2>
          <p className="text-sm text-muted-foreground">
            Manage your menu items, prices, tags, and availability.
          </p>
        </div>

        <Button onClick={handleAddClick} disabled={saving}>
          Add Item
        </Button>
      </div>

      {/* Simple table view for now */}
     <div className="rounded-xl bg-white border shadow-sm overflow-hidden">
  <table className="w-full text-sm">
    <thead className="bg-gray-50 text-gray-600 border-b">
      <tr>
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

        return (
          <tr key={item.id} className="hover:bg-gray-50 transition">
            {/* ITEM WITH IMAGE */}
<td className="px-6 py-4">
  <div className="flex items-center gap-3">
    {/* Thumbnail */}
    <div className="relative w-12 h-12 rounded-md overflow-hidden bg-gray-100">
      {item.image_url ? (
        <Image
          src={item.image_url}
          alt={item.name_en}
          fill
          className="object-cover"
          sizes="48px"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
          No Img
        </div>
      )}
    </div>

    {/* Text */}
    <div>
      <div className="font-medium text-gray-900">{item.name_en}</div>
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
                  <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs">
                    New
                  </span>
                )}
                {item.is_popular && (
                  <span className="px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 text-xs">
                    Popular
                  </span>
                )}
                {item.is_spicy && (
                  <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs">
                    Spicy
                  </span>
                )}
                {item.is_vegetarian && (
                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                    Veg
                  </span>
                )}
                {item.is_vegan && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                    Vegan
                  </span>
                )}
              </div>
            </td>

            {/* STATUS */}
            <td className="px-6 py-4">
              <div className="flex flex-col gap-1">
                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full w-fit">
                  {item.is_visible ? "Visible" : "Hidden"}
                </span>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full w-fit">
                  {item.is_available ? "Available" : "Sold Out"}
                </span>
              </div>
            </td>

            {/* ACTIONS */}
            <td className="px-6 py-4 text-right">
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleEditClick(item)}
                  className="px-2 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-100 transition"
                >
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(item.id)}
                  className="px-3 py-1 text-sm rounded-md bg-red-100 text-red-700 hover:bg-red-200 transition"
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
  onClose={() => {
    if (!saving) {
      setModalOpen(false);
      setEditingItem(null);
    }
  }}
  onSubmit={handleSubmit}
/>

    </div>
  );
}
