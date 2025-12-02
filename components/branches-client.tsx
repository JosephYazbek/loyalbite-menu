"use client";

import { useEffect, useState } from "react";
import {
  BranchHoursEditor,
  OpeningHours,
  ensureOpeningHours,
} from "@/components/branch-hours-editor";

type BranchRecord = {
  id: string;
  restaurant_id: string;
  name: string;
  slug: string;
  address: string | null;
  phone: string | null;
  whatsapp_number: string | null; // FIXED
  is_active: boolean;
  opening_hours: OpeningHours | null;
  created_at: string;
  updated_at: string | null;
};

type RestaurantRecord = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
};

type ApiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success" };

type FormMode = "create" | "edit";

type FormState = {
  id?: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  whatsapp: string;
  is_active: boolean;
  opening_hours: OpeningHours | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  slug: "",
  address: "",
  phone: "",
  whatsapp: "",
  is_active: true,
  opening_hours: ensureOpeningHours(null),  // ✅ FIXED
};

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-");
}

export function BranchesClient() {
  const [restaurant, setRestaurant] = useState<RestaurantRecord | null>(null);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<FormMode>("create");
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formState, setFormState] = useState<FormState>(EMPTY_FORM);
  const [apiState, setApiState] = useState<ApiState>({ status: "idle" });

  // Load branches
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        const res = await fetch("/api/admin/branches");
        const body = await res.json();

        if (!res.ok) throw new Error(body.error || "Failed to load branches");

        setRestaurant(body.restaurant ?? null);
        setBranches(body.branches ?? []);

        setLoadError(null);
      } catch (err: unknown) {
        setLoadError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const openCreateForm = () => {
    setFormMode("create");
    setFormState(EMPTY_FORM);
    setFormOpen(true);
    setApiState({ status: "idle" });
  };

  const openEditForm = (branch: BranchRecord) => {
    setFormMode("edit");
    setFormState({
      id: branch.id,
      name: branch.name,
      slug: branch.slug,
      address: branch.address ?? "",
      phone: branch.phone ?? "",
      whatsapp: branch.whatsapp_number ?? "",
      is_active: branch.is_active,
      opening_hours: branch.opening_hours
      ? ensureOpeningHours(branch.opening_hours)
      : ensureOpeningHours(null),
    });
    setFormOpen(true);
    setApiState({ status: "idle" });
  };

  const closeForm = () => {
    setFormOpen(false);
    setFormState(EMPTY_FORM);
  };

  const handleChange = (field: keyof FormState, value: unknown) => {
    setFormState((prev) => ({
      ...prev,
      [field]: value,
      ...(field === "name" && !prev.slug
        ? { slug: slugify(value as string) }
        : {}),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiState({ status: "loading" });

    try {
      const payload = {
        name: formState.name,
        slug: formState.slug,
        address: formState.address,
        phone: formState.phone,
        whatsapp: formState.whatsapp,
        is_active: formState.is_active,
        opening_hours: formState.opening_hours,
      };

      let res: Response;

      if (formMode === "create") {
        res = await fetch("/api/admin/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/branches/${formState.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to save branch");

      // Update UI
      if (formMode === "create") {
        setBranches((prev) => [...prev, body]);
      } else {
        setBranches((prev) =>
          prev.map((b) => (b.id === body.id ? body : b))
        );
      }

      setApiState({ status: "success" });
      closeForm();
    } catch (err: unknown) {
      setApiState({ status: "error", message: (err as Error).message });
    }
  };

  const handleDelete = async (branch: BranchRecord) => {
    if (!window.confirm(`Delete branch "${branch.name}"?`)) return;

    const res = await fetch(`/api/admin/branches/${branch.id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      setBranches((prev) => prev.filter((b) => b.id !== branch.id));
    } else {
      const body = await res.json();
      alert(body.error || "Failed to delete branch");
    }
  };

  // UI ----------------------

  if (loading) return <p>Loading branches…</p>;
  if (loadError) return <p className="text-red-600">{loadError}</p>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-lg font-semibold">Branches</h1>
          <p className="text-sm text-gray-600">
            Manage your branch locations and opening hours.
          </p>
        </div>

        <button
          onClick={openCreateForm}
          className="bg-black text-white px-4 py-2 rounded-md"
        >
          + Add Branch
        </button>
      </div>

      {branches.length === 0 ? (
        <div className="p-6 border rounded-md text-gray-500 text-sm">
          No branches yet.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {branches.map((branch) => (
            <div key={branch.id} className="border rounded-md p-4 space-y-2">
              <div className="flex justify-between">
                <div>
                  <p className="font-medium">{branch.name}</p>
                  <p className="text-xs text-gray-500">
                    /m/{restaurant?.slug}/{branch.slug}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    branch.is_active
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {branch.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              {branch.address && (
                <p className="text-sm text-gray-600">{branch.address}</p>
              )}

              <div className="flex justify-between mt-3 text-xs">
                <button
                  onClick={() => openEditForm(branch)}
                  className="text-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(branch)}
                  className="text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white rounded-md p-6 w-full max-w-xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between mb-4">
              <h2 className="font-semibold">
                {formMode === "create" ? "Add Branch" : "Edit Branch"}
              </h2>
              <button onClick={closeForm}>Close</button>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              {/* name */}
              <div>
                <label className="text-xs font-medium">Name</label>
                <input
                  type="text"
                  required
                  value={formState.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* slug */}
              <div>
                <label className="text-xs font-medium">Slug (URL)</label>
                <input
                  type="text"
                  value={formState.slug}
                  onChange={(e) => handleChange("slug", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* address */}
              <div>
                <label className="text-xs font-medium">Address</label>
                <input
                  type="text"
                  value={formState.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="w-full border rounded-md px-3 py-2 text-sm"
                />
              </div>

              {/* phone / whatsapp */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium">Phone</label>
                  <input
                    type="text"
                    value={formState.phone}
                    onChange={(e) => handleChange("phone", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">WhatsApp</label>
                  <input
                    type="text"
                    value={formState.whatsapp}
                    onChange={(e) => handleChange("whatsapp", e.target.value)}
                    className="w-full border rounded-md px-3 py-2 text-sm"
                  />
                </div>
              </div>

              {/* active */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formState.is_active}
                  onChange={(e) => handleChange("is_active", e.target.checked)}
                />
                <span className="text-sm">Branch is active</span>
              </div>

              {/* hours */}
              <BranchHoursEditor
                value={formState.opening_hours}
                onChange={(hours) => handleChange("opening_hours", hours)}
              />

              {/* submit */}
              <button
                type="submit"
                className="bg-black text-white px-4 py-2 rounded-md"
                disabled={apiState.status === "loading"}
              >
                {formMode === "create"
                  ? apiState.status === "loading"
                    ? "Creating…"
                    : "Create Branch"
                  : apiState.status === "loading"
                  ? "Saving…"
                  : "Save Changes"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
