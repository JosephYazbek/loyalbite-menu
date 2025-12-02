// app/admin/menu/categories/components/categories-client.tsx
"use client";

import { useState } from "react";
import type { Category } from "@/types/category";
import { CategoryModal, CategoryFormValues } from "./category-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageIcon } from "lucide-react";

type CategoriesClientProps = {
  restaurantName: string;
  initialCategories: Category[];
};

export function CategoriesClient({
  restaurantName,
  initialCategories,
}: CategoriesClientProps) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<"create" | "edit">("create");
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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

  const handleCreate = async (values: CategoryFormValues) => {
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) throw new Error("Failed to create category");
    const { category } = await res.json();
    setCategories((prev) => [...prev, category]);
  };

  const handleUpdate = async (values: CategoryFormValues) => {
    if (!editingCategory) return;

    const res = await fetch(`/api/admin/categories/${editingCategory.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });

    if (!res.ok) throw new Error("Failed to update category");
    const { category } = await res.json();

    setCategories((prev) =>
      prev.map((c) => (c.id === category.id ? category : c))
    );
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this category?");
    if (!confirmed) return;

    const res = await fetch(`/api/admin/categories/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) throw new Error("Failed to delete category");
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const modalInitialValues: CategoryFormValues | undefined =
    mode === "edit" && editingCategory
      ? {
          name_en: editingCategory.name_en ?? "",
          name_ar: editingCategory.name_ar ?? "",
          description_en: editingCategory.description_en ?? "",
          description_ar: editingCategory.description_ar ?? "",
          is_visible: editingCategory.is_visible ?? true,
          is_offers: editingCategory.is_offers ?? false,
          image_url: editingCategory.image_url ?? "",
        }
      : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-semibold">Menu Categories</h1>
          <p className="text-sm text-muted-foreground">
            Manage the categories for <span className="font-medium">{restaurantName}</span>.
          </p>
        </div>
        <Button onClick={openCreate}>+ Add Category</Button>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-4 py-3 text-left">Category</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Flags</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No categories yet.
                </td>
              </tr>
            )}

            {categories.map((cat) => (
              <tr key={cat.id} className="border-t hover:bg-gray-50">
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
                      <div className="h-10 w-10 rounded border flex items-center justify-center text-xs text-muted-foreground">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                    )}
                    <div>
                      <div className="font-medium">{cat.name_en}</div>
                      <div className="text-xs text-muted-foreground">
                        Order #{cat.display_order}
                      </div>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">
                  {cat.description_en || (
                    <span className="opacity-40">—</span>
                  )}
                </td>

                <td className="px-4 py-3 space-x-2">
                  {cat.is_visible && <Badge>Visible</Badge>}
                  {cat.is_offers && (
                    <Badge variant="secondary">Offers</Badge>
                  )}
                </td>

                <td className="px-4 py-3 text-right space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(cat)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(cat.id)}
                  >
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <CategoryModal
        open={modalOpen}
        mode={mode}
        initialValues={modalInitialValues}
        onClose={() => setModalOpen(false)}
        onSubmit={mode === "create" ? handleCreate : handleUpdate}
      />
    </div>
  );
}
